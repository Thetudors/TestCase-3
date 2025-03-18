import { Engine } from "./core/Engine";
import { SceneManager } from "./core/scene/SceneManager";
import { MainScene } from "./scenes/MainScene";

async function init() {
    const engine = new Engine();
    await engine.init();
    
    
    const sceneManager = SceneManager.init(engine);
    sceneManager.addScene('main', new MainScene());

}
init().catch(console.error);