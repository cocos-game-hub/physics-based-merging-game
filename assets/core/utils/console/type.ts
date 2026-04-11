export type HexColor = `#${ string }`;
export type GradientColor = `linear-gradient(${ string })`;
export type ColorValue = HexColor | GradientColor;

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

export type BuiltInColor = 'info' | 'error' | 'warn' | 'success' | 'debug';

export type ColorPreset = BuiltInColor | (string & {});

export interface ConsoleColors {
    info: GradientColor;
    error: GradientColor;
    warn: GradientColor;
    success: GradientColor;
    debug: GradientColor;

    [key: string]: ColorValue;
}