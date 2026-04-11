import { _decorator, Camera, Component, screen, view } from 'cc';
import logger from "db://assets/core/utils/console";

const { ccclass } = _decorator;

@ccclass('AspectKeeper')
export class AspectKeeper extends Component {
    private _gameCamera: Camera;

    onLoad() {
        this._gameCamera = this.getComponent(Camera);
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.onWindowResize();
    }

    onWindowResize() {
        if (!this._gameCamera) return;

        // Получаем размеры дизайна
        const designSize = view.getDesignResolutionSize();
        const designWidth = designSize.width;
        const designHeight = designSize.height;
        logger.debug(
            '[AspectKeeper]',
            'Design Resolution Size,', { width: designWidth, height: designHeight });

        // Получаем текущий размер окна
        const windowSize = screen.windowSize;
        const windowWidth = windowSize.width;
        const windowHeight = windowSize.height;
        logger.debug('[AspectKeeper]',
            'Window Size', { width: windowWidth, height: windowHeight });

        // Вычисляем, какую область мира должна показывать камера
        const aspect = windowWidth / windowHeight;
        const designAspect = designWidth / designHeight;

        let orthoHeight = designHeight / 2;

        if (aspect > designAspect) {
            // Окно шире — обрезаем по бокам
            orthoHeight = designHeight / 2;
        } else {
            // Окно уже — показываем больше по вертикали, чтобы сохранить ширину
            orthoHeight = (designWidth / aspect) / 2;
        }

        // Применяем к камере
        this._gameCamera.orthoHeight = orthoHeight;
    }
}


