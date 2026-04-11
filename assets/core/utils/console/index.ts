import { ColorPreset, ColorValue, ConsoleColors, LogLevel } from './type';

class Console {
    private static instance: Console;
    colors: ConsoleColors = {
        info: 'linear-gradient(-90deg,rgba(67, 153, 221, 1) 0%, rgba(67, 121, 221, 1) 100%)',
        error: 'linear-gradient(90deg,rgba(213, 59, 61, 1) 0%, rgba(213, 59, 82, 1) 100%)',
        warn: 'linear-gradient(-90deg,rgba(244, 159, 43, 1) 0%, rgba(244, 140, 43, 1) 100%)',
        success: 'linear-gradient(-90deg,rgba(52, 179, 78, 1) 0%, rgba(54, 179, 52, 1) 100%)',
        debug: 'linear-gradient(90deg,rgba(117, 117, 117, 1) 0%, rgba(145, 145, 145, 1) 100%)',
    };
    private isDev: boolean;
    private minLevel: LogLevel = 'info';
    private enabled: boolean = true;
    private readonly levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        success: 1, // success на уровне info
        warn: 2,
        error: 3
    };
    /**
     * Подсчет количества вызовов
     */
    private counters: Map<string, number> = new Map();

    private constructor(isDev?: boolean) {
        // Определяем dev режим: можно передать параметром или по наличию инструментов разработки
        if (isDev !== undefined) {
            this.isDev = isDev;
        } else {
            // Автоопределение: dev режим если есть инструменты разработки или localStorage флаг
            this.isDev = typeof window !== 'undefined' &&
                (window.location?.hostname === 'localhost' ||
                    window.location?.hostname === '127.0.0.1' ||
                    localStorage.getItem('DEBUG_MODE') === 'true');
        }
    }

    static getInstance(isDev?: boolean): Console {
        if (!Console.instance) {
            Console.instance = new Console(isDev);
        }
        return Console.instance;
    }

    /**
     * Установка режима разработки вручную
     */
    setDevMode(isDev: boolean): void {
        this.isDev = isDev;
    }

    /**
     * Установка минимального уровня логирования
     */
    setMinLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    /**
     * Включение/отключение логирования
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Основной метод логирования с бейджем
     */
    logBadge = (
        level: LogLevel,
        tag: string,
        label: string,
        color: ColorPreset = '#2A7B9B',
        ...messages: any[]
    ): void => {
        if (!this.shouldLog(level)) return;

        const finalColor: ColorValue = this.colors[color] ?? (color as ColorValue);
        const consoleMethod = level === 'error' ? 'error' :
            level === 'warn' ? 'warn' : 'log';

        window.console[consoleMethod](
            `%c ${ tag } %c${ label }`,
            `background:#555; color:#ADADAD; padding:2px 4px; border-radius:4px 0 0 4px; font-size:10px; font-weight:bold;`,
            `background:${ finalColor }; color:#fff; padding:2px 4px; border-radius:0 4px 4px 0; font-size:10px; font-weight:bold;`,
            ...messages
        );
    };

    /**
     * Универсальный метод логирования
     */
    log = (level: LogLevel, urlScript: string, ...messages: any[]): void => {
        const levelUpper = level.toUpperCase();
        this.logBadge(level, levelUpper, urlScript, level, ...messages);
    };

    // Упрощенные методы
    info = (urlScript: string, ...messages: any[]): void =>
        this.log('info', urlScript, ...messages);

    error = (urlScript: string, ...messages: any[]): void =>
        this.log('error', urlScript, ...messages);

    warn = (urlScript: string, ...messages: any[]): void =>
        this.log('warn', urlScript, ...messages);

    success = (urlScript: string, ...messages: any[]): void =>
        this.log('success', urlScript, ...messages);

    debug = (urlScript: string, ...messages: any[]): void =>
        this.log('debug', urlScript, ...messages);

    /**
     * Группировка сообщений
     */
    group = (label: string, collapsed: boolean = false, ...messages: any[]): void => {
        if (!this.enabled) return;

        if (collapsed) {
            console.groupCollapsed(label);
        } else {
            console.group(label);
        }
        messages.forEach(msg => console.log(msg));
        console.groupEnd();
    };

    /**
     * Логирование с таймингом
     */
    time = <T>(label: string, fn: () => T): T => {
        if (!this.enabled) return fn();

        console.time(label);
        const result = fn();
        console.timeEnd(label);
        return result;
    };

    /**
     * Асинхронное логирование с таймингом
     */
    timeAsync = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
        if (!this.enabled) return fn();

        console.time(label);
        const result = await fn();
        console.timeEnd(label);
        return result;
    };

    count = (label: string, urlScript: string, ...messages: any[]): void => {
        if (!this.enabled) return;

        const count = (this.counters.get(label) || 0) + 1;
        this.counters.set(label, count);
        this.info(urlScript, `[${ label }]`, `Count: ${ count }`, ...messages);
    };

    /**
     * Сброс счетчика
     */
    resetCount = (label: string): void => {
        this.counters.delete(label);
    };

    addColor(name: string, value: ColorValue): void {
        this.colors[name] = value;
    }

    getColor(name: string): ColorValue | undefined {
        return this.colors[name];
    }

    /**
     * Очистка консоли (только в dev режиме)
     */
    clear = (): void => {
        if (this.isDev && this.enabled) {
            console.clear();
        }
    };

    /**
     * Проверка, нужно ли логировать сообщение
     */
    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;
        if (level === 'debug' && !this.isDev) return false;
        return this.levelPriority[level] >= this.levelPriority[this.minLevel];
    }
}

// Экспорт синглтона с автоопределением dev режима
export default Console.getInstance();

export { Console };