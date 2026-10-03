"""House mode select entity for Rams Home."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN, MODES


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Add the house mode entity."""
    async_add_entities([HouseModeSelect(entry)])


class HouseModeSelect(SelectEntity, RestoreEntity):
    """The current mode of the house: home, away, sleep or holiday.

    The panel shows and changes this mode. Automations react to its state,
    so the integration itself never decides what a mode does.
    """

    _attr_has_entity_name = True
    _attr_translation_key = "house_mode"
    _attr_options = MODES
    _attr_icon = "mdi:home-switch-outline"

    def __init__(self, entry: ConfigEntry) -> None:
        self._attr_unique_id = f"{entry.entry_id}_house_mode"
        self._attr_current_option = "home"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Rams Home",
            manufacturer="Atelier Atomic",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        """Restore the last known mode after a restart."""
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is not None and last.state in MODES:
            self._attr_current_option = last.state

    async def async_select_option(self, option: str) -> None:
        """Change the house mode."""
        self._attr_current_option = option
        self.async_write_ha_state()
