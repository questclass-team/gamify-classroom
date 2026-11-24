from urllib.parse import quote
from uuid import UUID

import httpx
from django.conf import settings


class CoreGroupNotFound(Exception):
    pass


class CoreUnavailable(Exception):
    pass


class CoreClient:
    def _get_group(
        self,
        group_id: UUID,
        authorization: str,
    ) -> httpx.Response:
        url = (
            f"{settings.CORE_BASE_URL.rstrip('/')}"
            f"/api/core/groups/{quote(str(group_id), safe='')}"
        )

        try:
            response = httpx.get(
                url,
                headers={"Authorization": authorization},
                timeout=5,
            )
        except httpx.HTTPError as exc:
            raise CoreUnavailable from exc

        if response.status_code in {401, 403, 404}:
            raise CoreGroupNotFound

        if response.is_success:
            return response

        raise CoreUnavailable

    def ensure_group_access(
        self,
        group_id: UUID,
        authorization: str,
    ) -> None:
        self._get_group(
            group_id=group_id,
            authorization=authorization,
        )

    def ensure_student_in_group(
        self,
        group_id: UUID,
        student_id: UUID,
        authorization: str,
    ) -> None:
        response = self._get_group(
            group_id=group_id,
            authorization=authorization,
        )
        try:
            group = response.json()
        except ValueError as exc:
            raise CoreUnavailable from exc

        students = group.get("students") if isinstance(group, dict) else None
        if not isinstance(students, list):
            raise CoreUnavailable

        student_id_text = str(student_id)
        if not any(
            isinstance(student, dict) and student.get("id") == student_id_text
            for student in students
        ):
            raise CoreGroupNotFound
