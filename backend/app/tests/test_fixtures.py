import unittest
from datetime import datetime

from app.tests.fixtures import (
    build_social_community_group_stub,
    build_subscription_item_stub,
    build_subscription_stub,
)


class FixtureBuildersTestCase(unittest.TestCase):
    def test_build_subscription_item_stub_supports_contract_fields(self) -> None:
        renews_at = datetime(2026, 4, 30, 12, 0, 0)

        item = build_subscription_item_stub(
            module_key="maintenance",
            item_kind="addon",
            billing_cycle="quarterly",
            status="scheduled_cancel",
            renews_at=renews_at,
            is_prorated=True,
        )

        self.assertEqual(item.module_key, "maintenance")
        self.assertEqual(item.item_kind, "addon")
        self.assertEqual(item.billing_cycle, "quarterly")
        self.assertEqual(item.status, "scheduled_cancel")
        self.assertEqual(item.renews_at, renews_at)
        self.assertTrue(item.is_prorated)

    def test_build_subscription_stub_embeds_items_and_period_fields(self) -> None:
        starts_at = datetime(2026, 4, 1, 0, 0, 0)
        ends_at = datetime(2026, 4, 30, 23, 59, 59)
        grace_until = datetime(2026, 5, 5, 0, 0, 0)
        item = build_subscription_item_stub(module_key="iot")

        subscription = build_subscription_stub(
            base_plan_code="base_finance",
            status="grace_period",
            billing_cycle="monthly",
            current_period_starts_at=starts_at,
            current_period_ends_at=ends_at,
            grace_until=grace_until,
            is_co_termed=False,
            items=[item],
        )

        self.assertEqual(subscription.base_plan_code, "base_finance")
        self.assertEqual(subscription.status, "grace_period")
        self.assertEqual(subscription.current_period_starts_at, starts_at)
        self.assertEqual(subscription.current_period_ends_at, ends_at)
        self.assertEqual(subscription.grace_until, grace_until)
        self.assertFalse(subscription.is_co_termed)
        self.assertEqual(subscription.items[0].module_key, "iot")

    def test_build_social_community_group_stub_supports_operational_fields(self) -> None:
        group = build_social_community_group_stub(
            name="Los Arbolitos",
            commune="La Florida",
            sector="Sector Oriente",
            zone="Zona 3",
            territorial_classification="agrupacion_social",
        )

        self.assertEqual(group.name, "Los Arbolitos")
        self.assertEqual(group.commune, "La Florida")
        self.assertEqual(group.sector, "Sector Oriente")
        self.assertEqual(group.zone, "Zona 3")
        self.assertEqual(group.territorial_classification, "agrupacion_social")
        self.assertTrue(group.is_active)


if __name__ == "__main__":
    unittest.main()
