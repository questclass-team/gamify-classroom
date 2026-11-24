import json
from uuid import UUID

import httpx
import jwt
import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone

from gamification.models import Badge, BadgeAward, GroupGameConfiguration, Rank
from gamification.services import award_points
from gamification.tests.test_api import auth_header

GROUP_ID = UUID("11111111-1111-4111-8111-111111111111")
FOREIGN_GROUP_ID = UUID("22222222-2222-4222-8222-222222222222")
ME_ID = "33333333-3333-4333-8333-333333333333"
OUTSIDER_ID = "44444444-4444-4444-8444-444444444444"
ANNA_ID = "55555555-5555-4555-8555-555555555555"
BOB_ID = "66666666-6666-4666-8666-666666666666"
NO_NICK_ID = "77777777-7777-4777-8777-777777777777"
TEACHER_ID = "88888888-8888-4888-8888-888888888888"
FOREIGN_TEACHER_ID = "99999999-9999-4999-8999-999999999999"

pytestmark = pytest.mark.django_db


class FakeCore:
    """Core's roster endpoint: owning teacher or member student, else 404/403."""

    def __init__(self) -> None:
        self.roster = [
            {"studentId": ME_ID, "nickname": "Cichy Lis", "avatar": "fox"},
            {"studentId": ANNA_ID, "nickname": "anna", "avatar": "owl"},
            {"studentId": BOB_ID, "nickname": "Bob", "avatar": None},
            # An older Core without the avatar field: read as null.
            {"studentId": NO_NICK_ID, "nickname": None},
        ]
        self.response: httpx.Response | None = None
        self.calls = 0

    def get(self, url, *, headers, timeout):
        self.calls += 1
        if self.response is not None:
            return self.response

        claims = jwt.decode(
            headers["Authorization"].removeprefix("Bearer "),
            options={"verify_signature": False},
        )
        if not url.endswith(f"/api/core/groups/{GROUP_ID}/roster"):
            return httpx.Response(404)
        if claims["role"] == "admin":
            return httpx.Response(403)
        member_ids = {member["studentId"] for member in self.roster}
        allowed = (claims["role"] == "teacher" and claims["sub"] == TEACHER_ID) or (
            claims["role"] == "student" and claims["sub"] in member_ids
        )
        if not allowed:
            return httpx.Response(404)
        return httpx.Response(200, json=self.roster)


@pytest.fixture
def core(monkeypatch):
    fake = FakeCore()
    monkeypatch.setattr("common.core_client.httpx.get", fake.get)
    return fake


@pytest.fixture
def as_user(token_factory):
    def headers(role: str, subject: str) -> dict[str, str]:
        return auth_header(token_factory(role=role, subject=subject))

    return headers


@pytest.fixture
def ranks():
    configuration = GroupGameConfiguration.objects.create(
        group_id=str(GROUP_ID), currency_name="Złote monety"
    )
    for name, threshold in (("Nowicjusz", 0), ("Giermek", 100), ("Rycerz", 300)):
        Rank.objects.create(configuration=configuration, name=name, threshold=threshold)
    return configuration


def state_url(group_id=GROUP_ID):
    return reverse("game:student-group-state", kwargs={"group_id": group_id})


def ranking_url(group_id=GROUP_ID, by=None):
    url = reverse("game:group-ranking", kwargs={"group_id": group_id})
    return url if by is None else f"{url}?by={by}"


def give_points(student_id, points, group_id=GROUP_ID):
    award_points(
        group_id=group_id,
        student_id=UUID(student_id),
        points=points,
        reason="Aktywność",
        awarded_by=TEACHER_ID,
    )


def give_badge(student_id, name, group_id=GROUP_ID, *, revoked=False):
    badge = Badge.objects.create(group_id=str(group_id), name=name)
    return BadgeAward.objects.create(
        badge=badge,
        student_id=student_id,
        awarded_by=TEACHER_ID,
        revoked_at=timezone.now() if revoked else None,
    )


def test_state_shows_the_callers_balance_ranks_badges_and_rewards(
    api_client, as_user, core, ranks
):
    give_points(ME_ID, 60)
    give_points(ME_ID, 60)
    give_points(ANNA_ID, 500)
    give_points(ME_ID, 999, group_id=FOREIGN_GROUP_ID)
    first_badge = give_badge(ME_ID, "Pomocna dłoń")
    second_badge = give_badge(ME_ID, "Gwiazda")
    give_badge(ME_ID, "Cofnięta", revoked=True)
    give_badge(ANNA_ID, "Cudza")
    give_badge(ME_ID, "Inna grupa", group_id=FOREIGN_GROUP_ID)

    response = api_client.get(state_url(), **as_user("student", ME_ID))

    assert response.status_code == 200
    state = response.json()
    assert {key: state[key] for key in state if key not in {"badges", "rewards"}} == {
        "groupId": str(GROUP_ID),
        "nickname": "Cichy Lis",
        "avatar": "fox",
        "currencyName": "Złote monety",
        "currencyIconUrl": None,
        "balance": 120,
        "rank": {"name": "Giermek", "threshold": 100},
        "nextRank": {"name": "Rycerz", "threshold": 300},
    }
    assert [award["id"] for award in state["badges"]] == [
        second_badge.id,
        first_badge.id,
    ]
    assert state["badges"][0]["badge"]["name"] == "Gwiazda"
    assert state["badges"][0]["studentId"] == ME_ID
    assert [reward["points"] for reward in state["rewards"]] == [60, 60]
    assert state["rewards"][0]["id"] > state["rewards"][1]["id"]
    assert {reward["studentId"] for reward in state["rewards"]} == {ME_ID}


def test_state_defaults_without_configuration_progress_or_nickname(
    api_client, as_user, core
):
    response = api_client.get(state_url(), **as_user("student", NO_NICK_ID))

    assert response.status_code == 200
    assert response.json() == {
        "groupId": str(GROUP_ID),
        "nickname": None,
        "avatar": None,
        "currencyName": "Punkty",
        "currencyIconUrl": None,
        "balance": 0,
        "rank": None,
        "nextRank": None,
        "badges": [],
        "rewards": [],
    }


@pytest.mark.parametrize(
    ("points", "rank", "next_rank"),
    [
        (0, "Nowicjusz", "Giermek"),
        (99, "Nowicjusz", "Giermek"),
        (100, "Giermek", "Rycerz"),
        (300, "Rycerz", None),
        (5000, "Rycerz", None),
    ],
)
def test_state_rank_and_next_rank_edges(
    api_client, as_user, core, ranks, points, rank, next_rank
):
    if points:
        give_points(ME_ID, points)

    state = api_client.get(state_url(), **as_user("student", ME_ID)).json()

    assert state["rank"]["name"] == rank
    assert (state["nextRank"] or {}).get("name") == next_rank


def test_state_next_rank_when_no_rank_is_reached_yet(api_client, as_user, core):
    configuration = GroupGameConfiguration.objects.create(group_id=str(GROUP_ID))
    Rank.objects.create(configuration=configuration, name="Giermek", threshold=100)

    state = api_client.get(state_url(), **as_user("student", ME_ID)).json()

    assert state["rank"] is None
    assert state["nextRank"] == {"name": "Giermek", "threshold": 100}


def test_state_is_only_for_member_students(api_client, as_user, core):
    assert api_client.get(state_url(), **as_user("student", ME_ID)).status_code == 200
    assert (
        api_client.get(state_url(), **as_user("student", OUTSIDER_ID)).status_code
        == 404
    )
    assert (
        api_client.get(
            state_url(FOREIGN_GROUP_ID), **as_user("student", ME_ID)
        ).status_code
        == 404
    )
    assert api_client.get(state_url(), **as_user("student", "123")).status_code == 404
    calls_before_forbidden = core.calls
    for role, subject in (
        ("teacher", TEACHER_ID),
        ("teacher", FOREIGN_TEACHER_ID),
        ("admin", "admin"),
    ):
        assert api_client.get(state_url(), **as_user(role, subject)).status_code == 403
    assert api_client.get(state_url()).status_code == 401
    assert core.calls == calls_before_forbidden


def test_state_hides_a_group_when_the_roster_lacks_the_caller(
    api_client, as_user, core
):
    # Core lets the call through, but the caller is no longer on the roster.
    core.response = httpx.Response(200, json=[{"studentId": ANNA_ID, "nickname": "a"}])

    response = api_client.get(state_url(), **as_user("student", ME_ID))

    assert response.status_code == 404


@pytest.fixture
def ranked_group(ranks):
    # Points: Bob 320, Cichy Lis 120, anna 120, no nickname 0 (no progress row).
    # Active badges: anna 2, Cichy Lis 1, Bob 1, no nickname 0.
    give_points(BOB_ID, 320)
    give_points(ME_ID, 120)
    give_points(ANNA_ID, 120)
    give_points(OUTSIDER_ID, 1000)  # A former member who left the roster.
    give_badge(ANNA_ID, "A")
    give_badge(ANNA_ID, "B")
    give_badge(ME_ID, "C")
    give_badge(BOB_ID, "D")
    give_badge(BOB_ID, "E", revoked=True)
    give_badge(BOB_ID, "F", revoked=True)
    give_badge(NO_NICK_ID, "G", revoked=True)
    give_badge(NO_NICK_ID, "H", group_id=FOREIGN_GROUP_ID)
    give_badge(OUTSIDER_ID, "I")


def test_ranking_by_points_uses_competition_positions(
    api_client, as_user, core, ranked_group
):
    response = api_client.get(ranking_url(), **as_user("student", ME_ID))

    assert response.status_code == 200
    giermek = {"name": "Giermek", "threshold": 100}
    assert response.json() == {
        "groupId": str(GROUP_ID),
        "by": "points",
        "currencyName": "Złote monety",
        "currencyIconUrl": None,
        "entries": [
            {
                "position": 1,
                "nickname": "Bob",
                "avatar": None,
                "balance": 320,
                "rank": {"name": "Rycerz", "threshold": 300},
                "badgeCount": 1,
                "isMe": False,
            },
            {
                "position": 2,
                "nickname": "anna",
                "avatar": "owl",
                "balance": 120,
                "rank": giermek,
                "badgeCount": 2,
                "isMe": False,
            },
            {
                "position": 2,
                "nickname": "Cichy Lis",
                "avatar": "fox",
                "balance": 120,
                "rank": giermek,
                "badgeCount": 1,
                "isMe": True,
            },
            {
                "position": 4,
                "nickname": None,
                "avatar": None,
                "balance": 0,
                "rank": {"name": "Nowicjusz", "threshold": 0},
                "badgeCount": 0,
                "isMe": False,
            },
        ],
    }
    assert api_client.get(
        ranking_url(by="points"), **as_user("student", ME_ID)
    ).json() == (response.json())


def test_ranking_by_badges(api_client, as_user, core, ranked_group):
    response = api_client.get(ranking_url(by="badges"), **as_user("student", ME_ID))

    assert response.status_code == 200
    ranking = response.json()
    assert ranking["by"] == "badges"
    assert [
        (entry["position"], entry["nickname"], entry["badgeCount"], entry["balance"])
        for entry in ranking["entries"]
    ] == [
        (1, "anna", 2, 120),
        (2, "Bob", 1, 320),
        (2, "Cichy Lis", 1, 120),
        (4, None, 0, 0),
    ]


def test_ranking_ties_order_by_nickname_case_insensitively_with_nulls_last(
    api_client, as_user, core
):
    core.roster = [
        {"studentId": NO_NICK_ID, "nickname": None},
        {"studentId": BOB_ID, "nickname": "bob"},
        {"studentId": ME_ID, "nickname": None},
        {"studentId": ANNA_ID, "nickname": "Anna"},
    ]

    entries = api_client.get(ranking_url(), **as_user("student", ME_ID)).json()[
        "entries"
    ]

    assert [(entry["position"], entry["nickname"]) for entry in entries] == [
        (1, "Anna"),
        (1, "bob"),
        (1, None),
        (1, None),
    ]
    # The hidden tie-breaker is stable: the caller's ID sorts before NO_NICK_ID.
    assert [entry["isMe"] for entry in entries] == [False, False, True, False]


def test_state_passes_an_explicit_null_avatar_through(api_client, as_user, core):
    response = api_client.get(state_url(), **as_user("student", BOB_ID))

    assert response.status_code == 200
    assert response.json()["avatar"] is None


def test_avatars_pass_through_unvalidated(api_client, as_user, core):
    # Core owns the key list; Game does not second-guess it.
    core.roster = [{"studentId": ME_ID, "nickname": "Cichy Lis", "avatar": "unicorn"}]

    state = api_client.get(state_url(), **as_user("student", ME_ID)).json()
    ranking = api_client.get(ranking_url(), **as_user("student", ME_ID)).json()

    assert state["avatar"] == "unicorn"
    assert [entry["avatar"] for entry in ranking["entries"]] == ["unicorn"]


def test_ranking_rejects_an_unknown_criterion(api_client, as_user, core):
    for by in ("rank", "", "POINTS"):
        response = api_client.get(ranking_url(by=by), **as_user("student", ME_ID))
        assert response.status_code == 400
        assert "by" in response.json()


def test_ranking_access_by_role(api_client, as_user, core, ranked_group):
    student = api_client.get(ranking_url(), **as_user("student", ME_ID))
    teacher = api_client.get(ranking_url(), **as_user("teacher", TEACHER_ID))

    assert student.status_code == 200
    assert teacher.status_code == 200
    assert [entry["isMe"] for entry in teacher.json()["entries"]] == [False] * 4
    assert [entry["nickname"] for entry in teacher.json()["entries"]] == [
        entry["nickname"] for entry in student.json()["entries"]
    ]
    for group_id, role, subject in (
        (GROUP_ID, "student", OUTSIDER_ID),
        (GROUP_ID, "teacher", FOREIGN_TEACHER_ID),
        (FOREIGN_GROUP_ID, "student", ME_ID),
        (FOREIGN_GROUP_ID, "teacher", TEACHER_ID),
    ):
        response = api_client.get(ranking_url(group_id), **as_user(role, subject))
        assert response.status_code == 404
    calls_before_forbidden = core.calls
    assert api_client.get(ranking_url(), **as_user("admin", "admin")).status_code == 403
    assert api_client.get(ranking_url()).status_code == 401
    assert core.calls == calls_before_forbidden


def test_ranking_never_exposes_student_ids(api_client, as_user, core, ranked_group):
    for role, subject in (("student", ME_ID), ("teacher", TEACHER_ID)):
        for by in ("points", "badges"):
            response = api_client.get(ranking_url(by=by), **as_user(role, subject))
            body = response.content.decode()
            for student_id in (ME_ID, ANNA_ID, BOB_ID, NO_NICK_ID, OUTSIDER_ID):
                assert student_id not in body
            for entry in json.loads(body)["entries"]:
                assert set(entry) == {
                    "position",
                    "nickname",
                    "avatar",
                    "balance",
                    "rank",
                    "badgeCount",
                    "isMe",
                }


def test_ranking_query_count_does_not_grow_with_the_roster(
    api_client, as_user, core, ranks
):
    def count_queries() -> int:
        with CaptureQueriesContext(connection) as queries:
            response = api_client.get(ranking_url(), **as_user("teacher", TEACHER_ID))
        assert response.status_code == 200
        assert len(response.json()["entries"]) == len(core.roster)
        return len(queries)

    small = count_queries()
    for index in range(20):
        student_id = f"aaaaaaaa-aaaa-4aaa-8aaa-{index:012d}"
        core.roster.append({"studentId": student_id, "nickname": f"Gracz {index}"})
        give_points(student_id, index + 1)
        give_badge(student_id, f"Odznaka {index}")

    assert count_queries() == small


@pytest.mark.parametrize(
    "core_response",
    [
        httpx.Response(500),
        httpx.Response(200, text="not json"),
        httpx.Response(200, json={"students": []}),
        httpx.Response(200, json=[{"studentId": "not-a-uuid", "nickname": None}]),
        httpx.Response(200, json=[{"studentId": ME_ID, "nickname": 7}]),
        httpx.Response(200, json=[{"studentId": ME_ID, "nickname": None, "avatar": 7}]),
        httpx.Response(
            200, json=[{"studentId": ME_ID, "nickname": None, "avatar": ["fox"]}]
        ),
    ],
)
def test_core_failures_return_service_unavailable(
    api_client, as_user, core, core_response
):
    core.response = core_response

    assert api_client.get(state_url(), **as_user("student", ME_ID)).status_code == 503
    assert (
        api_client.get(ranking_url(), **as_user("teacher", TEACHER_ID)).status_code
        == 503
    )


def test_core_network_error_returns_service_unavailable(
    api_client, as_user, monkeypatch
):
    def unreachable(url, *, headers, timeout):
        raise httpx.ConnectError("Core is down")

    monkeypatch.setattr("common.core_client.httpx.get", unreachable)

    assert api_client.get(state_url(), **as_user("student", ME_ID)).status_code == 503
    assert api_client.get(ranking_url(), **as_user("student", ME_ID)).status_code == 503
