import BitOutput from './output';
import BitInput from './input';

const BOOLEANS = new Array(256);
const POWERS = new Array(53);

export { BitOutput, BitInput };

export function toSignedByte(unsigned){
    if(unsigned > 127){
        return unsigned - 256;
    }
    return unsigned;
};

export function toUnsignedByte(signed){
    if(signed < 0){
        return signed + 256;
    }
    return signed;
};

export function javaByteCast(number){
    number = roundTo0(number) % 256;
    if(number > 127){
        return number - 256;
    }
    if(number < -128){
        return number + 256;
    }
    return number;
};

export function javaCharCast(number){
    number = roundTo0(number) % 65536;
    if (number < 0){
        number += 65536;
    }
    return number;
};

export function javaIntCast(number){
    number = roundTo0(number) % 4294967296;
    if (number > 2147483647){
        number -= 4294967296;
    }
    if (number < -2147483648){
        number += 4294967296;
    }
    return number;
};

export function byteToBooleans(signed){
    return BOOLEANS[toUnsignedByte(signed)].slice(0, 8);
};

export function booleansToByte(b1, b2, b3, b4, b5, b6, b7, b8){
    if(Array.isArray(b1)){
        return booleansToByte(b1[0], b1[1], b1[2], b1[3], b1[4], b1[5], b1[6], b1[7]);
    }
    let signed = 64 * b1 + 32 * b2 + 16 * b3 + 8 * b4 + 4 * b5 + 2 * b6 + 1 * b7;
    if(!b8){
        signed = -signed;
        signed--;
    }
    return signed;
};

export function char0(char){
    return javaByteCast(char);
};

export function char1(char){
    return javaByteCast(char >> 8);
};

export function short0(short){
    return javaByteCast(short);
};

export function short1(short){
    return javaByteCast(short >> 8);
};

export function int0(int){
    return javaByteCast(int);
};

export function int1(int){
    return javaByteCast(int >> 8);
};

export function int2(int){
    return javaByteCast(int >> 16);
};

export function int3(int){
    return javaByteCast(int >> 24);
};

export function makeChar(char0, char1){
    return javaCharCast((char1 << 8) | (char0 & 0xff));
};

export function makeShort(short0, short1){
    return (short1 << 8) | (short0 & 0xff);
};

export function makeInt(int0, int1, int2, int3){
    return ((int3 << 24) | ((int2 & 0xff) << 16) | ((int1 & 0xff) <<  8) | (int0 & 0xff));
};

export function getRequiredBits(number){
    if(number < 0){
        number = -number - 1;
    }
    let l = 1;
    let b = 0;
    while(l <= number){
        l *= 2;
        b++;
    }
    return b;
};

function checkBitCount(bitCount){
    if(bitCount < 0){
        throw "bitCount (" + bitCount + ") can't be negative!";
    }
    if(bitCount > 53){
        throw "bitCount (" + bitCount + ") can't be greater than 2^53 (" + Math.pow(2, 53) + ")";
    }
};

function checkOverflow(number, bitCount){
    if(bitCount != 53 && (POWERS[bitCount] <= number || POWERS[bitCount] < -number)){
        throw 'You need more than ' + bitCount + ' bits to store the number ' + number;
    }
};

export function numberToBooleans(number, bitCount, allowNegative){
    checkBitCount(bitCount);
    checkOverflow(number, bitCount);
    const neg = allowNegative ? 1 : 0;
    const bools = new Array(bitCount + neg);
    if(allowNegative){
        if(number >= 0){
            bools[0] = true;
        }
        else {
            bools[0] = false;
            number = -number;
            number--;
        }
    }
    for(let bit = 0; bit < bitCount; bit++){
        if(number >= POWERS[bitCount - bit - 1]){
            number -= POWERS[bitCount - bit - 1];
            bools[bit + neg] = true;
        }
        else {
            bools[bit + neg] = false;
        }
    }
    return bools;
};

export function numberFromBooleans(bools, bitCount, allowNegative){
    checkBitCount(bitCount);
    let number = 0;
    const neg = allowNegative ? 1 : 0;
    for(let index = 0; index < bitCount; index++){
        if(bools[index + neg]){
            number += POWERS[bitCount - index - 1];
        }
    }
    if(allowNegative && !bools[0]){
        number = -number;
        number--;
    }
    return number;
};

export function stringFromUint16Array(array){
    const length = array.length;
    let result = '';
    let addition = Math.pow(2,16)-1;

    for (let i = 0; i < length; i += addition){
        if (i + addition > length) {
            addition = length - i;
        }
        result += String.fromCharCode.apply(null, array.subarray(i,i+addition));
    }
    return result;
};

export function uint16ArrayFromString(string){
    const length = string.length;
    const result = new Uint16Array(length);

    for (let i = 0; i < length; i++){
        result[i] = string.charCodeAt(i);
    }

    return result;
}

for(let unsigned = 0; unsigned < 256; unsigned++){
	let signed = toSignedByte(unsigned);
	BOOLEANS[unsigned] = [false, false, false, false, false, false, false, false];
	if(signed >= 0){
		BOOLEANS[unsigned][7] = true;
	}
	else {
		signed = -signed;
		signed--;
	}
	if(signed >= 64){
		BOOLEANS[unsigned][0] = true;
		signed -= 64;
	}
	if(signed >= 32){
		BOOLEANS[unsigned][1] = true;
		signed -= 32;
	}
	if(signed >= 16){
		BOOLEANS[unsigned][2] = true;
		signed -= 16;
	}
	if(signed >= 8){
		BOOLEANS[unsigned][3] = true;
		signed -= 8;
	}
	if(signed >= 4){
		BOOLEANS[unsigned][4] = true;
		signed -= 4;
	}
	if(signed >= 2){
		BOOLEANS[unsigned][5] = true;
		signed -= 2;
	}
	if(signed >= 1){
		BOOLEANS[unsigned][6] = true;
	}
}

//initialize powers

(function(){
	let power = 1;
	for(let index = 0; index < POWERS.length; index++){
		POWERS[index] = power;
		power *= 2;
	}
}());