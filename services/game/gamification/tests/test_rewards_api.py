import httpx
import pytest
from django.urls import reverse

from gamification.models import GroupGameConfiguration, Rank
from gamification.tests.test_api import auth_header

GROUP_ID = "11111111-1111-4111-8111-111111111111"
OTHER_GROUP_ID = "22222222-2222-4222-8222-222222222222"
STUDENT_ID = "33333333-3333-4333-8333-333333333333"
OUTSIDER_ID = "44444444-4444-4444-8444-444444444444"

pytestmark = pytest.mark.django_db


def student_url(name, *, group_id=GROUP_ID, student_id=STUDENT_ID):
    return reverse(
        f"game:{name}",
        kwargs={"group_id": group_id, "student_id": student_id},
    )


@pytest.fixture
def core_group(monkeypatch):
    def get(url, *, headers, timeout):
        assert headers["Authorization"].startswith("Bearer ")
        if url.endswith((f"/groups/{GROUP_ID}", f"/groups/{OTHER_GROUP_ID}")):
            return httpx.Response(200, json={"students": [{"id": STUDENT_ID}]})
        return httpx.Response(404)

    monkeypatch.setattr("common.core_client.httpx.get", get)


def test_award_points_updates_balance_rank_and_history(
    api_client,
    token_factory,
    core_group,
):
    configuration = GroupGameConfiguration.objects.create(group_id=GROUP_ID)
    Rank.objects.create(configuration=configuration, name="Giermek", threshold=100)
    headers = auth_header(token_factory(role="teacher"))
    rewards_url = student_url("student-rewards")
    progress_url = student_url("student-progress")
    rewards = []

    for points, balance, rank in (
        (60, 60, None),
        (40, 100, {"name": "Giermek", "threshold": 100}),
    ):
        response = api_client.post(
            rewards_url,
            {"points": points, "reason": "Aktywność"},
            format="json",
            **headers,
        )
        assert response.status_code == 201
        reward = response.json()
        assert reward["points"] == points
        assert reward["reason"] == "Aktywność"
        assert reward["studentId"] == STUDENT_ID
        assert reward["awardedBy"] == "123"
        assert reward["createdAt"]
        assert reward["id"]
        rewards.append(reward)

        progress = api_client.get(progress_url, **headers)
        assert progress.status_code == 200
        assert progress.json()["balance"] == balance
        assert progress.json()["rank"] == rank

    assert api_client.get(rewards_url, **headers).json() == rewards[::-1]

    other_progress = student_url("student-progress", group_id=OTHER_GROUP_ID)
    other_rewards = student_url("student-rewards", group_id=OTHER_GROUP_ID)
    assert api_client.get(other_progress, **headers).json()["balance"] == 0
    assert api_client.get(other_rewards, **headers).json() == []


def test_invalid_points_do_not_change_balance_or_history(
    api_client,
    token_factory,
    core_group,
):
    headers = auth_header(token_factory(role="teacher"))
    rewards_url = student_url("student-rewards")

    for points in (-1, 0, True, "10", 2**31):
        response = api_client.post(
            rewards_url, {"points": points}, format="json", **headers
        )
        assert response.status_code == 400
        assert "points" in response.json()

    response = api_client.post(
        rewards_url, {"points": 2**31 - 1}, format="json", **headers
    )
    assert response.status_code == 201
    saved_reward = response.json()
    response = api_client.post(rewards_url, {"points": 1}, format="json", **headers)
    assert response.status_code == 400
    assert "points" in response.json()
    assert api_client.get(rewards_url, **headers).json() == [saved_reward]
    progress = api_client.get(student_url("student-progress"), **headers)
    assert progress.json()["balance"] == 2**31 - 1


def test_points_require_a_teacher_and_a_group_member(
    api_client, token_factory, core_group
):
    rewards_url = student_url("student-rewards")
    payload = {"points": 10, "reason": "Aktywność"}
    teacher = auth_header(token_factory(role="teacher"))
    student = auth_header(token_factory(role="student"))

    assert (
        api_client.post(rewards_url, payload, format="json", **student).status_code
        == 403
    )
    assert api_client.get(rewards_url, **student).status_code == 403
    for url in (
        student_url("student-rewards", student_id=OUTSIDER_ID),
        student_url("student-rewards", group_id=OUTSIDER_ID),
    ):
        assert (
            api_client.post(url, payload, format="json", **teacher).status_code == 404
        )

    assert api_client.get(rewards_url, **teacher).json() == []
