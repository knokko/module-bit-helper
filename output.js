import {
    short0, short1,
    char0, char1,
    int0, int1, int2, int3,
    numberToBooleans,
    getRequiredBits,
    byteToBooleans,
    booleansToByte,
    makeChar
} from './index';

export default class BitOutput {

    writeShort(short) {
        this.writeBytes([short0(short), short1(short)]);
    }

    writeChar(char) {
        this.writeBytes([char0(char), char1(char)]);
    }

    writeInt(int) {
        this.writeBytes([int0(int), int1(int), int2(int), int3(int)]);
    }

    writeBooleans(booleans) {
        for (let index in booleans) {
            this.writeBoolean(booleans[index]);
        }
    }

    writeBytes(bytes) {
        for (let index in bytes) {
            this.writeByte(bytes[index]);
        }
    }

    writeShorts(shorts) {
        for (let index in shorts) {
            this.writeShort(shorts[index]);
        }
    }

    writeChars(chars) {
        for (let index in chars) {
            this.writeChar(chars[index]);
        }
    }

    writeInts(ints) {
        for (let index in ints) {
            this.writeInt(ints[index]);
        }
    }

    writeBooleanArray(array) {
        this.writeInt(array.length);
        this.writeBooleans(array);
    }

    writeByteArray(array) {
        this.writeInt(array.length);
        this.writeBytes(array);
    }

    writeShortArray(array) {
        this.writeInt(array.length);
        this.writeInts(array);
    }

    writeCharArray(array) {
        this.writeInt(array.length);
        this.writeChars(array);
    }

    writeIntArray(array) {
        this.writeInt(array.length);
        this.writeInts(array);
    }

    writeNumber(number, bitcount, allowNegative) {
        this.writeBooleans(numberToBooleans(number, bitcount, allowNegative));
    }

    writeVarUint(number) {
        const bits = getRequiredBits(number);
        if (bits > 0) {
            this.writeNumber(bits - 1, 6, false);
            this.writeNumber(value, bits, false);
        } else {
            this.writeNumber(0, 6, false);
            this.writeBoolean(false);
        }
    }

    writeJavaString(string) {
        if (string === null || string === undefined) {//java doesn't have undefined, so we will make it just null
            this.writeInt(-1);
            return;
        }
        let max = 1;
        for (let index = 0; index < string.length; index++) {
            const charCode = string.charCodeAt(index);
            if (charCode > max) {
                max = charCode;
            }
        }
        const bitCount = getRequiredBits(max);
        this.writeInt(string.length);
        this.writeNumber(bitCount - 1, 4, false);
        for (let index = 0; index < string.length; index++) {
            this.writeNumber(string.charCodeAt(index), bitCount, false);
        }
    }

    writeString(string) {

        // For compatibility with other languages, null and undefined will be treated the same
        if (string === null || string === undefined) {
            this.writeByte(0);
            return;
        }

        // We will use this a lot
        const length = string.length;

        if (length < 254) {

            // Expected situation
            this.writeByte(length + 1);
        } else {

            // This way of storing the length costs 1 byte in this case, but spares 3 bytes in the other more likely case
            this.addByte(255);
            this.addInt(length);
        }

        // If the string is empty, we are done already
        if (length > 0) {

            // Those values will be changed in the first iteration of the next loop
            let max = 0;
            let min = 65535;

            // Determine minimum and maximum char code
            for (let index = 0; index < length; index++) {
                const current = string.charCodeAt(index);
                if (current > max) {
                    max = current;
                }
                if (current < min) {
                    min = current;
                }
            }

            const difference = max - min;
            let bitCount = 0;

            // Difference will be 0 for strings like 'aaa'
            if (difference !== 0) {

                // Most likely case
                bitCount = getRequiredBits(difference);
            }

            this.writeChar(min);
            this.writeNumber(bitCount, 5, false);

            // If the difference is 0, the string is already defined by the length and smallest/min character
            if (difference > 0) {

                for (let index = 0; index < length; index++) {
                    this.writeNumber(string.charCodeAt(index) - min, bitCount, false);
                }
            }
        }
    }
}

export class ByteArrayBitOutput extends BitOutput {

    constructor(array, startIndex, terminate){
        super();
        this.array = array ? array : new Int8Array(100);
        this.index = startIndex ? startIndex : 0;
        this.boolIndex = 0;
        if(terminate){
            this.onTerminate = terminate;
        }
    }
    
    terminate(){
        if (this.boolIndex !== 0){
            this.index++;
            this.boolIndex = 0;
        }
        if (this.onTerminate){
            this.onTerminate();
        }
    }
    
    getBytes(){
        return this.array.subarray(0, this.index);
    }
    
    getRawBytes(){
        return this.array;
    }
    
    writeBoolean(boolean){
        if (this.index >= this.array.length){
            this.increaseCapacity();
        }
        if(this.boolIndex === 7){
            this.boolIndex = 0;
            const old = byteToBooleans(this.array[this.index]);
            old[7] = boolean;
            this.internalAddByte(booleansToByte(old));
            return;
        }
        const bools = byteToBooleans(this.array[this.index]);
        bools[this.boolIndex++] = boolean;
        this.internalAddByte(booleansToByte(bools));
        this.index--;//undo the increment of the internalAddByte
    }
    
    internalAddByte(byte){
        this.array[this.index++] = byte;
    }
    
    increaseCapacity(){
        const newArray = new Int8Array(this.index + 500);//add some extra space to improve performance
        newArray.set(this.array);
        this.array = newArray;
    }
    
    writeByte(byte){
        if (this.index >= this.array.length){
            this.increaseCapacity();
        }
        if(this.boolIndex === 0){
            this.internalAddByte(byte);
            return;
        }
        const bools = byteToBooleans(byte);
        const current = byteToBooleans(this.array[this.index]);
        let boolsIndex = 0;
        for(let index = this.boolIndex; index < 8; index++){
            current[index] = bools[boolsIndex++];
        }
        this.internalAddByte(booleansToByte(current));
        const next = [false, false, false, false, false, false, false, true];
        let nextIndex = 0;
        for(; boolsIndex < 8; boolsIndex++){
            next[nextIndex++] = bools[boolsIndex];
        }
        if (this.index >= this.array.length){
            this.increaseCapacity();
        }
        this.internalAddByte(booleansToByte(next));
        this.index--;//the index has been increased twice
    }
}

export class StringBitOutput extends BitOutput {

    constructor(terminate){
        super();
        this.string = '';
        this.boolIndex = 0;
        this.currentBools = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
        if(terminate){
            this.onTerminate = terminate;
        }
    }
    
    terminate(){
        if(this.boolIndex > 0){
            this.string += String.fromCharCode(makeChar(booleansToByte(this.currentBools.slice(0, 8)), booleansToByte(this.currentBools.slice(8, 16))));
        }
        if(this.onTerminate){
            this.onTerminate();
        }
    }
    
    writeBoolean(boolean){
        if(this.boolIndex === 15){
            this.boolIndex = 0;
            this.currentBools[15] = boolean;
            this.string += String.fromCharCode(makeChar(booleansToByte(this.currentBools.slice(0, 8)), booleansToByte(this.currentBools.slice(8, 16))));
            this.currentBools = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
        }
        else {
            this.currentBools[this.boolIndex++] = boolean;
        }
    }
    
    writeByte(byte){
        const bools = byteToBooleans(byte);
        for(let index = 0; index < 8; index++){
            this.writeBoolean(bools[index]);//a custom writeByte method will barely improve performance anyway
        }
    }
}

export class CharArrayBitOutput extends BitOutput {

    constructor(array, startIndex, terminate){
        super();
        this.array = array || new Uint16Array(100);
        this.index = startIndex || 0;
        this.boolIndex = 0;
        this.currentBools = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
        if(terminate){
            this.onTerminate = terminate;
        }
    }
    
    ensureCapacity(extraMargin){
        if (this.index >= this.array.length){
            const newArray = new Uint16Array(this.index + extraMargin);//add some extra space to improve performance
            newArray.set(this.array);
            this.array = newArray;
        }
    }
    
    terminate(){
        if(this.boolIndex > 0){
            this.ensureCapacity(1);
            this.array[this.index++] = makeChar(booleansToByte(this.currentBools.slice(0, 8)), booleansToByte(this.currentBools.slice(8, 16)));
        }
        if(this.onTerminate){
            this.onTerminate();
        }
    }
    
    writeBoolean(boolean){
        if(this.boolIndex === 15){
            this.boolIndex = 0;
            this.ensureCapacity(500);
            this.currentBools[15] = boolean;
            this.array[this.index++] = makeChar(booleansToByte(this.currentBools.slice(0, 8)), booleansToByte(this.currentBools.slice(8, 16)));
            this.currentBools = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
        }
        else {
            this.currentBools[this.boolIndex++] = boolean;
        }
    }
    
    writeByte(){
        const bools = byteToBooleans(byte);
        for(let index = 0; index < 8; index++){
            this.writeBoolean(bools[index]);//a custom writeByte method will barely improve performance anyway
        }
    }
    
    toString(){
        return stringFromUint16Array(this.array.subarray(0, this.index));
    }
}