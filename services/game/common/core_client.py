from urllib.parse import quote

import httpx
from django.conf import settings


class CoreGroupNotFound(Exception):
    pass


class CoreUnavailable(Exception):
    pass


class CoreClient:
    def ensure_group_access(
        self,
        group_id: str,
        authorization: str,
    ) -> None:
        url = (
            f"{settings.CORE_BASE_URL.rstrip('/')}"
            f"/api/core/groups/{quote(group_id, safe='')}"
        )

        try:
            response = httpx.get(
                url,
                headers={"Authorization": authorization},
                timeout=5,
            )
        except httpx.HTTPError as exc:
            raise CoreUnavailable from exc

        if 200 <= response.status_code < 300:
            return

        if response.status_code in {401, 403, 404}:
            raise CoreGroupNotFound

        raise CoreUnavailable
