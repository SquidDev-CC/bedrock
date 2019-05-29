# ![CC: Tweaked](logo.png) (Bedrock Edition)

CC: Tweaked (Bedrock Edition) is a proof-of-concept addon to the latest betas
of Minecraft Windows 10 Edition. While it does technically run, I really would
not recommend using it for anything serious.

## Features and misfeatures
 - Open normal and advanced computers, with almost all the capabilities of
   CC:Tweaked (no palettes or http).
 - Painfully slow user interactions. I'm not quite sure why - I run similar code
   on the browser and it's _fine_ (not great, but fine).
 - No interaction with the world (no redstone, no turtles).
 - No persistance (all computer contents is lost on world unload).

## Usage
 - Grab the `.mcaddon` file from the releases page.
 - Double click it to load it into Minecraft. Make sure you're on the latest 
   beta (1.12.0.6).
 - Create a new world, enable experimental options and add the CC:T behaviour and
   resource packs.

## Building
Building CC:TBE is a little painful, though most tasks only need to be run once.
If you just want to play with this addon, you can grab it from the releases
page!

 - Build [cloud-catcher](https://github.com/SquidDev-CC/cloud-catcher) as
   described in its README.
 - Compile and run the `src/resources/experimental_ui/{gen-css,gen-fonts}`
   files.
 - Run `npm run build`. You should receive a built `CCTweaked.mcaddon` file in
   the base directory.
