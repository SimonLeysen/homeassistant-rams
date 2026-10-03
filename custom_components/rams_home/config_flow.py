"""Config and options flow for Rams Home."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_ALARM,
    CONF_PERSONS,
    CONF_ROOMS,
    CONF_TITLE,
    CONF_WEATHER,
    DOMAIN,
)


def _schema(options: dict[str, Any]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Optional(CONF_TITLE, default=options.get(CONF_TITLE, "Home")): str,
            vol.Optional(
                CONF_ROOMS, default=options.get(CONF_ROOMS, [])
            ): selector.AreaSelector(selector.AreaSelectorConfig(multiple=True)),
            vol.Optional(
                CONF_WEATHER,
                description={"suggested_value": options.get(CONF_WEATHER)},
            ): selector.EntitySelector(selector.EntitySelectorConfig(domain="weather")),
            vol.Optional(
                CONF_PERSONS, default=options.get(CONF_PERSONS, [])
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="person", multiple=True)
            ),
            vol.Optional(
                CONF_ALARM,
                description={"suggested_value": options.get(CONF_ALARM)},
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="alarm_control_panel")
            ),
        }
    )


class RamsHomeConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up Rams Home from the UI."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(
                title="Rams Home", data={}, options=user_input
            )
        return self.async_show_form(step_id="user", data_schema=_schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return RamsHomeOptionsFlow()


class RamsHomeOptionsFlow(OptionsFlow):
    """Change rooms, weather, persons and alarm after setup."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="init", data_schema=_schema(dict(self.config_entry.options))
        )
