---
layout: default
title: Media player (template)
permalink: /examples/media-player-template/media-player.md
permalink: /examples/media-player-template/media-player/
redirect_from:
  - /flex-cells-card/examples/media-player-template/media-player.md
  - /examples/media-player-template/media-player.md
---

# Media player (template)

Below you'll find an example of using HTML temples in FCC. The simple instructions below will allow you to run this template on your own, allowing you to see how the templates work.

1) Add a new card to the dashboard and overwrite its entire configuration with the [media-player.yaml](media-player.yaml) file (remember to replace the entities with your own).
2) To make the volume slider work, you need to do two things:  
  a) add the automations [from player to slider](automation-playerToSlider.yaml) and [from slider to player](automation-sliderToPlayer.yaml) (remember to replace the entities with your own)  
  b) add two [input_number](input-number.yaml)

After restarting, everything should work.

![media player](images/small_dark.jpg)
![media player](images/small_light.jpg)
![media player](images/large_dark.jpg)
![media player](images/large_light.jpg)