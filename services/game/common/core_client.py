from dataclasses import dataclass
from urllib.parse import quote
from uuid import UUID

import httpx
from django.conf import settings


class CoreGroupNotFound(Exception):
    pass


class CoreUnavailable(Exception):
    pass


@dataclass(frozen=True)
class RosterMember:
    student_id: str
    nickname: str | None
    avatar: str | None


class CoreClient:
    def _get_group(
        self,
        group_id: UUID,
        authorization: str,
        suffix: str = "",
    ) -> httpx.Response:
        url = (
            f"{settings.CORE_BASE_URL.rstrip('/')}"
            f"/api/core/groups/{quote(str(group_id), safe='')}{suffix}"
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

    def get_group_roster(
        self,
        group_id: UUID,
        authorization: str,
    ) -> list[RosterMember]:
        """Return the current members of a group the caller may see.

        Core answers only the owning teacher and member students; anyone else gets
        401/403/404, reported as CoreGroupNotFound.
        """
        response = self._get_group(
            group_id=group_id,
            authorization=authorization,
            suffix="/roster",
        )
        try:
            members = response.json()
        except ValueError as exc:
            raise CoreUnavailable from exc

        if not isinstance(members, list):
            raise CoreUnavailable

        roster = []
        for member in members:
            if not isinstance(member, dict):
                raise CoreUnavailable
            student_id = member.get("studentId")
            nickname = member.get("nickname")
            # Older Core omits the avatar; Game passes keys through unvalidated.
            avatar = member.get("avatar")
            if (
                not isinstance(student_id, str)
                or not (nickname is None or isinstance(nickname, str))
                or not (avatar is None or isinstance(avatar, str))
            ):
                raise CoreUnavailable
            try:
                student_id = str(UUID(student_id))
            except ValueError as exc:
                raise CoreUnavailable from exc
            roster.append(
                RosterMember(student_id=student_id, nickname=nickname, avatar=avatar)
            )
        return roster

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
