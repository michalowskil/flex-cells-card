# Button Lights

The first three buttons: control the brightness and color of the lighting. The icon color and brightness of the icon depend on the color and brightness of the lighting. A single click on the icon turns the lighting on/off. A double click on the icon sets the brightness to 50%. Holding the icon sets the brightness to 100%. When the lighting is on, it displays the lighting intensity as a percentage instead of the name. Clicking on the name/percentage takes you to "more-info" where you can select the color/brightness. Icons from entities are overridden by dynamic rules and differ depending on the on/off state.

The remaining buttons: only turn on/off. A single click turns the lighting on/off regardless of whether you click on the icon or the name. The icons are from entities.

The number of columns in which the buttons are arranged is dynamic and depends on the available width. If you want a fixed number of columns, replace "auto-fit" with any number.

Add a new card to the dashboard and overwrite its entire configuration with the [button-lights.yaml](button-lights.yaml) file (remember to replace the entities with your own).

![button lights](images/dark.png)
![button lights](images/light.png)