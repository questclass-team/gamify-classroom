from uuid import UUID

import httpx
import pytest
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from gamification.models import Badge, BadgeAward, StudentProgress
from gamification.tests.test_api import auth_header

GROUP_ID = UUID("11111111-1111-4111-8111-111111111111")
OTHER_GROUP_ID = UUID("22222222-2222-4222-8222-222222222222")
STUDENT_ID = UUID("33333333-3333-4333-8333-333333333333")
OUTSIDER_ID = UUID("44444444-4444-4444-8444-444444444444")
OTHER_STUDENT_ID = UUID("55555555-5555-4555-8555-555555555555")
TEACHER_ID = "123"  # The subject issued by token_factory.

pytestmark = pytest.mark.django_db


def student_badges_url(*, group_id=GROUP_ID, student_id=STUDENT_ID):
    return reverse(
        "game:student-badge-award",
        kwargs={"group_id": group_id, "student_id": student_id},
    )


@pytest.fixture
def core_groups(monkeypatch):
    def get(url, *, headers, timeout):
        assert headers["Authorization"].startswith("Bearer ")
        if url.endswith(
            (f"/api/core/groups/{GROUP_ID}", f"/api/core/groups/{OTHER_GROUP_ID}"),
        ):
            return httpx.Response(
                200,
                json={
                    "students": [
                        {"id": str(STUDENT_ID)},
                        {"id": str(OTHER_STUDENT_ID)},
                    ]
                },
            )
        return httpx.Response(404)

    monkeypatch.setattr("common.core_client.httpx.get", get)


@pytest.fixture
def teacher_headers(token_factory):
    return auth_header(token_factory(role="teacher"))


@pytest.fixture
def badge():
    return Badge.objects.create(group_id=GROUP_ID, name="Pomocna dłoń")


def test_teacher_creates_and_awards_badge_without_student_progress(
    api_client,
    teacher_headers,
    core_groups,
):
    response = api_client.post(
        reverse("game:group-badge-create", kwargs={"group_id": GROUP_ID}),
        {"name": "Pomocna dłoń", "description": "Za pomoc w klasie"},
        format="json",
        **teacher_headers,
    )
    assert response.status_code == 201
    created_badge = response.json()
    badge = Badge.objects.get(pk=created_badge["id"])
    assert badge.group_id == str(GROUP_ID)
    assert badge.name == created_badge["name"] == "Pomocna dłoń"
    assert badge.description == created_badge["description"] == "Za pomoc w klasie"
    assert badge.icon == created_badge["icon"] == "medal"

    assert not StudentProgress.objects.filter(student_id=STUDENT_ID).exists()
    before_award = timezone.now()
    response = api_client.post(
        student_badges_url(),
        {"badgeId": badge.pk},
        format="json",
        **teacher_headers,
    )
    assert response.status_code == 201
    result = response.json()
    award = BadgeAward.objects.get(pk=result["id"])
    assert award.badge_id == result["badgeId"] == badge.pk
    assert award.student_id == result["studentId"] == str(STUDENT_ID)
    assert award.awarded_by == result["awardedBy"] == TEACHER_ID
    assert before_award <= award.created_at <= timezone.now()
    assert parse_datetime(result["createdAt"]) == award.created_at
    assert not StudentProgress.objects.filter(student_id=STUDENT_ID).exists()


def test_teacher_cannot_award_badge_from_another_group(
    api_client,
    teacher_headers,
    core_groups,
    badge,
):
    count_before = BadgeAward.objects.count()
    response = api_client.post(
        student_badges_url(group_id=OTHER_GROUP_ID),
        {"badgeId": badge.pk},
        format="json",
        **teacher_headers,
    )
    assert response.status_code == 404
    assert BadgeAward.objects.count() == count_before


def test_awarding_requires_a_teacher_and_a_group_member(
    api_client,
    token_factory,
    teacher_headers,
    core_groups,
    badge,
):
    student_response = api_client.post(
        student_badges_url(),
        {"badgeId": badge.pk},
        format="json",
        **auth_header(token_factory(role="student")),
    )
    assert student_response.status_code == 403

    outsider_response = api_client.post(
        student_badges_url(student_id=OUTSIDER_ID),
        {"badgeId": badge.pk},
        format="json",
        **teacher_headers,
    )
    assert outsider_response.status_code == 404
    assert not BadgeAward.objects.exists()


def test_awarding_the_same_badge_twice_returns_conflict(
    api_client,
    teacher_headers,
    core_groups,
    badge,
):
    url = student_badges_url()
    payload = {"badgeId": badge.pk}

    first_response = api_client.post(url, payload, format="json", **teacher_headers)
    assert first_response.status_code == 201

    duplicate_response = api_client.post(url, payload, format="json", **teacher_headers)
    assert duplicate_response.status_code == 409
    assert BadgeAward.objects.count() == 1
    assert BadgeAward.objects.get().pk == first_response.json()["id"]


def test_teacher_can_patch_only_a_badge_in_the_selected_group(
    api_client,
    teacher_headers,
    core_groups,
    badge,
):
    def badge_url(group_id):
        return reverse(
            "game:group-badge-detail",
            kwargs={"group_id": group_id, "badge_id": badge.pk},
        )

    response = api_client.patch(
        badge_url(OTHER_GROUP_ID),
        {"name": "Inna nazwa"},
        format="json",
        **teacher_headers,
    )
    assert response.status_code == 404

    url = badge_url(GROUP_ID)
    invalid = api_client.patch(
        url, {"name": "Inna nazwa", "icon": "unknown"}, format="json", **teacher_headers
    )
    assert invalid.status_code == 400

    response = api_client.patch(url, {"icon": "star"}, format="json", **teacher_headers)
    assert response.status_code == 200
    badge.refresh_from_db()
    assert badge.name == response.json()["name"] == "Pomocna dłoń"
    assert badge.icon == response.json()["icon"] == "star"


def test_lists_only_active_badges_for_the_selected_student_and_group(
    api_client,
    teacher_headers,
    core_groups,
    badge,
):
    first = BadgeAward.objects.create(
        badge=badge, student_id=STUDENT_ID, awarded_by=TEACHER_ID
    )
    another_badge = Badge.objects.create(group_id=GROUP_ID, name="Współpraca")
    latest = BadgeAward.objects.create(
        badge=another_badge, student_id=STUDENT_ID, awarded_by=TEACHER_ID
    )
    BadgeAward.objects.create(
        badge=badge, student_id=OUTSIDER_ID, awarded_by=TEACHER_ID
    )
    BadgeAward.objects.create(
        badge=Badge.objects.create(group_id=OTHER_GROUP_ID, name="Inna grupa"),
        student_id=STUDENT_ID,
        awarded_by=TEACHER_ID,
    )

    url = student_badges_url()
    assert api_client.get(url).status_code == 401
    response = api_client.get(url, **teacher_headers)
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [latest.pk, first.pk]
    assert response.json()[0]["badge"]["name"] == "Współpraca"


def test_revoking_preserves_history_and_allows_a_new_award(
    api_client,
    teacher_headers,
    core_groups,
    badge,
):
    award = BadgeAward.objects.create(
        badge=badge, student_id=STUDENT_ID, awarded_by=TEACHER_ID
    )

    def award_url(group_id=GROUP_ID, student_id=STUDENT_ID):
        return reverse(
            "game:student-badge-award-detail",
            kwargs={
                "group_id": group_id,
                "student_id": student_id,
                "award_id": award.pk,
            },
        )

    for wrong_url in (
        award_url(group_id=OTHER_GROUP_ID),
        award_url(student_id=OTHER_STUDENT_ID),
    ):
        assert api_client.delete(wrong_url, **teacher_headers).status_code == 404
    award.refresh_from_db()
    assert award.revoked_at is None

    url = award_url()
    assert api_client.delete(url, **teacher_headers).status_code == 204
    award.refresh_from_db()
    revoked_at = award.revoked_at
    assert revoked_at is not None

    list_url = student_badges_url()
    assert api_client.get(list_url, **teacher_headers).json() == []
    result = api_client.post(
        list_url, {"badgeId": badge.pk}, format="json", **teacher_headers
    )
    assert result.status_code == 201
    assert result.json()["id"] != award.pk

    assert api_client.delete(url, **teacher_headers).status_code == 204
    award.refresh_from_db()
    assert award.revoked_at == revoked_at
    assert [
        item["id"] for item in api_client.get(list_url, **teacher_headers).json()
    ] == [result.json()["id"]]


def group_badges_url(group_id=GROUP_ID):
    return reverse("game:group-badge-create", kwargs={"group_id": group_id})


def test_teacher_lists_group_badges_oldest_first(
    api_client,
    teacher_headers,
    core_groups,
):
    newer = Badge.objects.create(group_id=GROUP_ID, name="Druga", icon="star")
    older = Badge.objects.create(group_id=GROUP_ID, name="Pierwsza")
    Badge.objects.filter(pk=older.pk).update(
        created_at=newer.created_at - timezone.timedelta(minutes=1)
    )
    same_time = Badge.objects.create(group_id=GROUP_ID, name="Trzecia")
    Badge.objects.filter(pk=same_time.pk).update(created_at=newer.created_at)
    Badge.objects.create(group_id=OTHER_GROUP_ID, name="Obca")

    response = api_client.get(group_badges_url(), **teacher_headers)

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [older.pk, newer.pk, same_time.pk]
    assert body[1] == {
        "id": newer.pk,
        "groupId": str(GROUP_ID),
        "name": "Druga",
        "description": "",
        "icon": "star",
        "createdAt": body[1]["createdAt"],
    }
    assert parse_datetime(body[1]["createdAt"]) == newer.created_at


def test_listing_group_badges_returns_empty_list(
    api_client,
    teacher_headers,
    core_groups,
):
    response = api_client.get(group_badges_url(), **teacher_headers)

    assert response.status_code == 200
    assert response.json() == []


def test_listing_badges_of_a_foreign_group_returns_not_found(
    api_client,
    teacher_headers,
    core_groups,
):
    foreign_group_id = UUID("66666666-6666-4666-8666-666666666666")
    Badge.objects.create(group_id=foreign_group_id, name="Cudza")

    response = api_client.get(group_badges_url(foreign_group_id), **teacher_headers)

    assert response.status_code == 404


@pytest.mark.parametrize("role", ["student", "admin"])
def test_listing_group_badges_requires_a_teacher(
    api_client,
    token_factory,
    core_groups,
    badge,
    role,
):
    response = api_client.get(
        group_badges_url(), **auth_header(token_factory(role=role))
    )

    assert response.status_code == 403


def test_listing_group_badges_when_core_is_down_returns_service_unavailable(
    api_client,
    teacher_headers,
    monkeypatch,
):
    def get(url, *, headers, timeout):
        raise httpx.ConnectError("Core is down")

    monkeypatch.setattr("common.core_client.httpx.get", get)

    response = api_client.get(group_badges_url(), **teacher_headers)

    assert response.status_code == 503
