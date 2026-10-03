"""Rams Home: a custom full screen home panel for Home Assistant."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_PLAYING, Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    CONF_ALARM,
    CONF_PERSONS,
    CONF_ROOMS,
    CONF_TITLE,
    CONF_WEATHER,
    DOMAIN,
    PANEL_ELEMENT,
    PANEL_URL,
    STATIC_URL,
)

PLATFORMS: list[Platform] = [Platform.SELECT]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register services that do not depend on a config entry."""

    async def handle_all_off(call: ServiceCall) -> None:
        """Turn off every light and pause every playing media player."""
        await hass.services.async_call(
            "light", "turn_off", {"entity_id": "all"}, blocking=False
        )
        playing = [
            state.entity_id
            for state in hass.states.async_all("media_player")
            if state.state == STATE_PLAYING
        ]
        if playing:
            await hass.services.async_call(
                "media_player", "media_pause", {"entity_id": playing}, blocking=False
            )

    hass.services.async_register(DOMAIN, "all_off", handle_all_off)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the panel and the house mode entity."""
    data = hass.data.setdefault(DOMAIN, {})

    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(Path(__file__).parent / "frontend"),
                    cache_headers=False,
                )
            ]
        )
        data["static_registered"] = True

    integration = await async_get_integration(hass, DOMAIN)
    options = entry.options

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=options.get(CONF_TITLE) or "Home",
        sidebar_icon="mdi:home-variant-outline",
        module_url=f"{STATIC_URL}/rams-home-panel.js?v={integration.version}",
        require_admin=False,
        config={
            "rooms": options.get(CONF_ROOMS, []),
            "weather": options.get(CONF_WEATHER),
            "persons": options.get(CONF_PERSONS, []),
            "alarm": options.get(CONF_ALARM),
        },
    )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload when options change so the panel picks up the new config."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel and unload platforms."""
    frontend.async_remove_panel(hass, PANEL_URL)
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
