import { logDebug } from './log';

export type ConsumableLike<T> = T | Consumable<T>;

export class Consumable<T> {
    private value: T | undefined;

    private readonly __isConsumable = true;

    constructor(value: ConsumableLike<T>) {
        if (value && typeof value === 'object' && (value as Consumable<T>).__isConsumable) {
            return value as Consumable<T>;
        }

        this.value = value as T;
    }

    peek(): T | undefined {
        return this.value;
    }

    consume(): T | undefined {
        logDebug('Consuming object', this.value);
        const value = this.value;
        this.value = undefined;
        return value;
    }

    get consumed(): boolean {
        return this.value === undefined;
    }
}
