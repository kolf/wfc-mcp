export type InterfaceInfo = {
    name: string;
    params: string[];
    jsdoc?: string;
};

export type EventInfo = {
    name: string;
    value: string;
};

export type MessageTypeInfo = {
    name: string;
    typeEnum: string;
    typeValue: number | null;
    typeDescription: string | null;
    flag: string;
    flagValue: number | null;
    flagDescription: string | null;
    contentClazz: string;
    classFile: string | null;
    classFileRelative: string | null;
    extends: string | null;
    jsdoc: string | null;
};

export type MessageClassInfo = {
    filePath: string;
    className: string;
    baseClass?: string;
    jsdoc?: string;
};
