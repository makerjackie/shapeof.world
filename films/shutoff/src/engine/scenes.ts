// Registers every scene module with the engine (imported once by World.tsx before the engine is created).
import { registerScenes } from "./engine";
import { phoneScene } from "./phone";
import { cityScene } from "./city";
import { serverScene } from "./server";
import { controlScene } from "./control";
import { earthScene } from "./earth";

registerScenes({ phone: phoneScene, city: cityScene, server: serverScene, control: controlScene, earth: earthScene });
