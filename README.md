# Rams Home

A full screen home panel for Home Assistant, designed after Dieter Rams' principles. It replaces the dashboard experience with its own layout: an analogue clock, house mode, an "everything off" control, a weekly forecast and every room at a glance, with dedicated views for lights, heating and security. It adapts from wall tablet to phone and supports light and dark mode.

## What it adds

* A sidebar panel at `/rams`.
* `select.rams_home_house_mode` with the options home, away, sleep and holiday. The panel shows and changes it; your automations decide what each mode does.
* The service `rams_home.all_off`, which turns off every light and pauses every playing media player. Heating and security are left alone.

## Installation

### HACS (custom repository)
1. HACS, three dots, Custom repositories, add this repository as type Integration.
2. Download Rams Home and restart Home Assistant.
3. Settings, Devices and services, Add integration, Rams Home.

### Manual
1. Copy `custom_components/rams_home` into `/config/custom_components/`.
2. Restart Home Assistant.
3. Settings, Devices and services, Add integration, Rams Home.

## Configuration

During setup, and later through the integration options, you choose:

* Rooms: the areas shown as rooms. Leave empty to show every area.
* Weather: a weather entity with a daily forecast. Entities that report precipitation probability show it as a percentage.
* People: the person entities shown as present.
* Alarm system: the alarm control panel used in the Security view.

Lights and heating are found per room through each entity's area, or its device's area.

## Appearance

Theme (follow system, light or dark) and accent colour are chosen in the panel's Settings view and stored per device.
