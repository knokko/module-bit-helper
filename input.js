import {
    makeShort,
    makeChar,
    makeInt,
    numberFromBooleans,
    stringFromUint16Array,
    byteToBooleans,
    booleansToByte,
    char0,
    char1
} from './index';

export default class BitInput {

    readShort() {
        return makeShort(this.readByte(), this.readByte());
    }

    readChar() {
        return makeChar(this.readByte(), this.readByte());
    };

    readInt() {
        return makeInt(this.readByte(), this.readByte(), this.readByte(), this.readByte());
    };

    readBooleans(amount) {
        const array = new Array(amount);
        for (let index = 0; index < amount; index++) {
            array[index] = this.readBoolean();
        }
        return array;
    };

    readBytes(amount) {
        const array = new Int8Array(amount);
        for (let index = 0; index < amount; index++) {
            array[index] = this.readByte();
        }
        return array;
    };

    readShorts(amount) {
        const array = new Int16Array(amount);
        for (let index = 0; index < amount; index++) {
            array[index] = this.readShort();
        }
        return array;
    };

    readChars(amount) {
        const array = new Uint16Array(amount);
        for (let index = 0; index < amount; index++) {
            array[index] = this.readChar();
        }
        return array;
    };

    readInts(amount) {
        const array = new Int32Array(amount);
        for (let index = 0; index < amount; index++) {
            array[index] = this.readInt();
        }
        return array;
    };

    readBooleanArray() {
        return this.readBooleans(this.readInt());
    };

    readByteArray() {
        return this.readBytes(this.readInt());
    };

    readShortArray() {
        return this.readShorts(this.readInt());
    };

    readCharArray() {
        return this.readChars(this.readInt());
    };

    readIntArray() {
        return this.readInts(this.readInt());
    };

    readNumber(bitCount, allowNegative) {
        let size = bitCount;
        if (allowNegative) {
            size++;
        }
        return numberFromBooleans(this.readBooleans(size), bitCount, allowNegative);
    };

    readJavaString() {
        const length = this.readInt();
        if (length === -1) {
            return null;
        }
        const bitCount = this.readNumber(4, false) + 1;
        let string = '';
        for (let index = 0; index < length; index++) {
            string += String.fromCharCode(this.readNumber(bitCount, false));
        }
        return string;
    };

    readString() {
        const length1 = this.readByte() & 0xFF;

        if (length1 === 0) {

            // This is how we save null/undefined strings
            return null;
        }

        let length = 0;
        if (length1 < 255) {
            length = length1 - 1;
        } else {
            length = this.readInt();
        }

        // If length is 0, it must be the empty string
        if (length === 0) {
            return '';
        }

        const chars = new Uint16Array(length);

        const min = this.readChar();
        const bitCount = this.readNumber(5, false);

        if (bitCount === 0) {

            // The string is a sequence that repears the same character, like 'aaa'
            for (let index = 0; index < length; index++) {
                chars[index] = min;
            }
        } else {

            // We will have to do some effort to read the string
            for (let index = 0; index < length; index++) {
                chars[index] = min + this.readNumber(bitCount, false);
            }
        }

        return stringFromUint16Array(chars);
    };
}

export class ByteArrayBitInput extends BitInput {

    constructor(array, startIndex, terminate) {
        this.array = array;
        this.index = startIndex ? startIndex : 0;
        this.boolIndex = 0;
        this.onTerminate = terminate;
    }

    terminate() {
        if (this.onTerminate) {
            this.onTerminate();
        }
    }

    readBoolean() {
        if (this.boolIndex === 7) {
            this.boolIndex = 0;
            return byteToBooleans(this.array[this.index++])[7];
        }
        return byteToBooleans(this.array[this.index])[this.boolIndex++];
    };

    readByte() {
        if (this.boolIndex === 0) {
            return this.array[this.index++];
        }
        const bools1 = byteToBooleans(this.array[this.index++]);
        const bools2 = byteToBooleans(this.array[this.index]);//do not increaese the byteIndex because this byte is not yet finished
        const bools = new Array(8);
        let boolsIndex = 0;
        for (let index = this.boolIndex; index < 8; index++) {
            bools[boolsIndex++] = bools1[index];
        }
        let index = 0;
        for (; boolsIndex < 8; boolsIndex++) {
            bools[boolsIndex] = bools2[index++]
        }
        return booleansToByte(bools);
    };
}

export class StringBitInput extends BitInput {

    constructor(string, startIndex, terminate) {
        this.string = string;
        this.index = startIndex || 0;
        this.boolIndex = 0;
        if (terminate) {
            this.onTerminate = terminate;
        }
    }

    terminate() {
        if (this.onTerminate) {
            this.onTerminate();
        }
    }

    readBoolean() {
        if (this.boolIndex < 8) {
            return byteToBooleans(char0(this.string.charCodeAt(this.index)))[this.boolIndex++];
        }
        if (this.boolIndex === 15) {
            this.boolIndex = 0;
            return byteToBooleans(char1(this.string.charCodeAt(this.index++)))[7];
        }
        return byteToBooleans(char1(this.string.charCodeAt(this.index)))[this.boolIndex++ - 8];
    }

    readByte() {
        if (this.boolIndex === 0) {
            this.boolIndex = 8;
            return char0(this.string.charCodeAt(this.index));
        }
        if (this.boolIndex === 8) {
            this.boolIndex = 0;
            return char1(this.string.charCodeAt(this.index++));
        }
        let bools1;
        let bools2;
        if (this.boolIndex < 8) {
            const charCode = this.string.charCodeAt(this.index);
            bools1 = byteToBooleans(char0(charCode));
            bools2 = byteToBooleans(char1(charCode));
            this.boolIndex += 8;
        }
        else {
            bools1 = byteToBooleans(char1(this.string.charCodeAt(this.index++)));
            bools2 = byteToBooleans(char0(this.string.charCodeAt(this.index)));
            this.boolIndex -= 8;
        }
        const bools = new Array(8);
        let boolsIndex = 0;
        for (let index = this.boolIndex % 8; index < 8; index++) {
            bools[boolsIndex++] = bools1[index];
        }
        let index = 0;
        for (; boolsIndex < 8; boolsIndex++) {
            bools[boolsIndex] = bools2[index++]
        }
        return booleansToByte(bools);
    }
}

export class CharArrayBitInput extends BitInput {

    constructor(array, startIndex, terminate){
        this.array = array;
        this.index = startIndex || 0;
        this.boolIndex = 0;
        if(terminate){
            this.onTerminate = terminate;
        }
    };
    
    terminate(){
        if (this.onTerminate){
            this.onTerminate();
        }
    }
    
    readBoolean(){
        if(this.boolIndex < 8){
            return byteToBooleans(char0(this.array[this.index]))[this.boolIndex++];
        }
        if(this.boolIndex === 15){
            this.boolIndex = 0;
            return byteToBooleans(char1(this.array[this.index++]))[7];
        }
        return byteToBooleans(char1(this.array[this.index]))[this.boolIndex++ - 8];
    }
    
    readByte(){
        if(this.boolIndex === 0){
            this.boolIndex = 8;
            return char0(this.array[this.index]);
        }
        if(this.boolIndex === 8){
            this.boolIndex = 0;
            return char1(this.array[this.index++]);
        }
        let bools1;
        let bools2;
        if(this.boolIndex < 8){
            const charCode = this.array[this.index];
            bools1 = byteToBooleans(char0(charCode));
            bools2 = byteToBooleans(char1(charCode));
            this.boolIndex += 8;
        }
        else {
            bools1 = byteToBooleans(char1(this.array[this.index++]));
            bools2 = byteToBooleans(char0(this.array[this.index]));
            this.boolIndex -= 8;
        }
        const bools = new Array(8);
        let boolsIndex = 0;
        for(let index = this.boolIndex % 8; index < 8; index++){
            bools[boolsIndex++] = bools1[index];
        }
        let index = 0;
        for(; boolsIndex < 8; boolsIndex++){
            bools[boolsIndex] = bools2[index++]
        }
        return booleansToByte(bools);
    }
}