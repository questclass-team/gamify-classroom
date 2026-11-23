import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

APP = "gamification"
POINTS = (APP, "0003_studentprogress_pointreward")
LEGACY_BADGES = (APP, "0004_badge_alter_groupgameconfiguration_group_id_and_more")
REPAIR = (APP, "0006_restore_external_ids_as_text")
BADGES = (APP, "0004_group_badges")
GROUP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
STUDENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
TEACHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize(
    "old_badge_migration", [False, True], ids=["main", "old-branch"]
)
def test_badge_migrations_preserve_existing_game_data(old_badge_migration):
    try:
        old = MigrationExecutor(connection).migrate([POINTS]).apps
        configuration = old.get_model(APP, "GroupGameConfiguration").objects.create(
            group_id=GROUP_ID, currency_name="Monety"
        )
        old.get_model(APP, "Rank").objects.create(
            configuration=configuration, name="Giermek", threshold=100
        )
        progress = old.get_model(APP, "StudentProgress").objects.create(
            group_id=GROUP_ID, student_id=STUDENT_ID, balance=100
        )
        reward = old.get_model(APP, "PointReward").objects.create(
            progress=progress, points=100, awarded_by=TEACHER_ID
        )

        target = BADGES
        if old_badge_migration:
            old = MigrationExecutor(connection).migrate([LEGACY_BADGES]).apps
            badge = old.get_model(APP, "Badge").objects.create(
                group_id=GROUP_ID, name="Pomocna dłoń"
            )
            old.get_model(APP, "BadgeAward").objects.create(
                badge=badge, student_id=STUDENT_ID, awarded_by=TEACHER_ID
            )
            target = REPAIR

        executor = MigrationExecutor(connection)
        if not old_badge_migration:
            assert [
                migration.name for migration, _ in executor.migration_plan([target])
            ] == [BADGES[1]]
        new = executor.migrate([target]).apps
        saved_config = new.get_model(APP, "GroupGameConfiguration").objects.get(
            group_id=GROUP_ID
        )
        assert saved_config.pk == configuration.pk
        assert saved_config.currency_name == "Monety"
        assert saved_config.ranks.get().name == "Giermek"
        saved_progress = new.get_model(APP, "StudentProgress").objects.get(
            group_id=GROUP_ID, student_id=STUDENT_ID
        )
        assert saved_progress.balance == 100
        assert saved_progress.rewards.get().pk == reward.pk

        if old_badge_migration:
            award = new.get_model(APP, "BadgeAward").objects.get(
                badge__group_id=GROUP_ID, student_id=STUDENT_ID
            )
            assert award.badge.icon == "medal"
            assert award.awarded_by == TEACHER_ID
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
