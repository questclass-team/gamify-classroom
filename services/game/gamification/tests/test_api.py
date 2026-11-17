from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from common.core_client import CoreClient, CoreGroupNotFound, CoreUnavailable
from gamification.models import GroupGameConfiguration


def auth_header(token: str) -> dict[str, str]:
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.fixture
def group_access(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        CoreClient,
        "ensure_group_access",
        lambda _self, _group_id, _authorization: None,
    )


@pytest.fixture
def config_url() -> str:
    return reverse("game:group-game-config", kwargs={"group_id": "group-1"})


@pytest.fixture
def icon_url() -> str:
    return reverse("game:currency-icon", kwargs={"group_id": "group-1"})


@pytest.fixture
def media_root(settings, tmp_path: Path) -> Path:
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.mark.django_db
def test_get_returns_default_configuration(
    api_client,
    token_factory,
    group_access,
    config_url,
):
    response = api_client.get(
        config_url,
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 200
    assert response.json() == {
        "currencyName": "Punkty",
        "currencyIconUrl": None,
        "ranks": [],
    }


@pytest.mark.django_db
def test_put_updates_and_sorts_configuration(
    api_client,
    token_factory,
    group_access,
    config_url,
):
    response = api_client.put(
        config_url,
        {
            "currencyName": "  Złote monety  ",
            "ranks": [
                {"name": "Rycerz", "threshold": 300},
                {"name": "Nowicjusz", "threshold": 0},
                {"name": "Giermek", "threshold": 100},
            ],
        },
        format="json",
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 200
    assert response.json() == {
        "currencyName": "Złote monety",
        "currencyIconUrl": None,
        "ranks": [
            {"name": "Nowicjusz", "threshold": 0},
            {"name": "Giermek", "threshold": 100},
            {"name": "Rycerz", "threshold": 300},
        ],
    }

    configuration = GroupGameConfiguration.objects.get(group_id="group-1")
    assert configuration.ranks.count() == 3


@pytest.mark.django_db
@pytest.mark.parametrize(
    "payload",
    [
        {"currencyName": "", "ranks": []},
        {
            "currencyName": "Punkty",
            "ranks": [
                {"name": "A", "threshold": 0},
                {"name": "B", "threshold": 0},
            ],
        },
        {
            "currencyName": "Punkty",
            "ranks": [
                {"name": "A", "threshold": 0},
                {"name": "a", "threshold": 100},
            ],
        },
        {
            "currencyName": "Punkty",
            "ranks": [
                {"name": "A", "threshold": 1_000_001},
            ],
        },
        {
            "currencyName": "Punkty",
            "ranks": [{"name": str(index), "threshold": index} for index in range(21)],
        },
    ],
)
def test_put_rejects_invalid_configuration(
    api_client,
    token_factory,
    group_access,
    config_url,
    payload,
):
    response = api_client.put(
        config_url,
        payload,
        format="json",
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 400
    assert not GroupGameConfiguration.objects.filter(group_id="group-1").exists()


@pytest.mark.django_db
def test_student_cannot_access_configuration(
    api_client,
    token_factory,
    group_access,
    config_url,
):
    response = api_client.get(
        config_url,
        **auth_header(token_factory(role="student")),
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_missing_core_group_returns_not_found(
    api_client,
    token_factory,
    monkeypatch,
    config_url,
):
    def missing_group(_self, _group_id, _authorization):
        raise CoreGroupNotFound

    monkeypatch.setattr(CoreClient, "ensure_group_access", missing_group)

    response = api_client.get(
        config_url,
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_core_unavailable_returns_service_unavailable(
    api_client,
    token_factory,
    monkeypatch,
    config_url,
):
    def unavailable(_self, _group_id, _authorization):
        raise CoreUnavailable

    monkeypatch.setattr(CoreClient, "ensure_group_access", unavailable)

    response = api_client.get(
        config_url,
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 503


@pytest.mark.django_db
def test_upload_and_delete_currency_icon(
    api_client,
    token_factory,
    group_access,
    icon_url,
    media_root,
):
    upload = SimpleUploadedFile(
        "coin.png",
        b"fake-png-content",
        content_type="image/png",
    )
    headers = auth_header(token_factory(role="teacher"))

    response = api_client.put(icon_url, {"file": upload}, format="multipart", **headers)

    assert response.status_code == 200
    icon_response = response.json()
    assert "/api/game/media/currency-icons/" in icon_response["currencyIconUrl"]
    assert list(media_root.rglob("*"))

    delete_response = api_client.delete(icon_url, **headers)

    assert delete_response.status_code == 204
    assert not GroupGameConfiguration.objects.get(group_id="group-1").currency_icon


@pytest.mark.django_db
def test_upload_rejects_unsupported_icon(
    api_client,
    token_factory,
    group_access,
    icon_url,
):
    upload = SimpleUploadedFile(
        "coin.txt",
        b"not-an-image",
        content_type="text/plain",
    )

    response = api_client.put(
        icon_url,
        {"file": upload},
        format="multipart",
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_upload_rejects_large_icon(
    api_client,
    token_factory,
    group_access,
    icon_url,
):
    upload = SimpleUploadedFile(
        "coin.png",
        b"x" * (256 * 1024 + 1),
        content_type="image/png",
    )

    response = api_client.put(
        icon_url,
        {"file": upload},
        format="multipart",
        **auth_header(token_factory(role="teacher")),
    )

    assert response.status_code == 400
