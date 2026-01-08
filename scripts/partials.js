// filtering thresholds - adjust these later on if necessary
// not interested in making them user definable for now, should Just Work
const MIN_DURATION_RATIO = 0.3;      // partial must last at least 30% of total duration
const MAX_FREQUENCY_CV = 0.1;        // frequency coefficient of variation must be <= 10%
const MIN_AMPLITUDE_RATIO = 0.01;    // peak amplitude must be at least 1% of global max

let selectedFiles = null;

const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertButton');
const statusDiv = document.getElementById('status');
const profileNameInput = document.getElementById('profileName');
const quantiseCheckbox = document.getElementById('quantiseCheckbox');
const oddOnlyCheckbox = document.getElementById('oddOnlyCheckbox');

fileInput.addEventListener('change', handleFileSelect);
convertBtn.addEventListener('click', handleConvert);

function handleFileSelect() {
    // TODO: implement file selection logic
}

async function handleConvert() {
    // TODO: implement conversion logic
}

function convertVutuToZebra(vutuData, options) {
    // options: { profileName, quantise, oddOnly }

    // calculate max/total duration
    // find loudest amplitude in any partial anywhere
    let totalDuration = 0;
    let globalMaxAmp = 0;
    for (const key in vutuData) {
        if (key.startsWith('p')) {
            const partial = vutuData[key];
            const partialEnd = partial.time[partial.time.length - 1];
            const partialMaxAmp = Math.max(...partial.amp);
            totalDuration = Math.max(totalDuration, partialEnd);
            globalMaxAmp = Math.max(globalMaxAmp, partialMaxAmp);
        }
    }

    // analyse all partials and filter out those we don't need
    const analysedPartials = [];
    for (const key in vutuData) {
        if (key.startsWith('p')) {
            const analysed = analysePartial(vutuData[key], globalMaxAmp, totalDuration);
            if (analysed !== null) {
                analysedPartials.push(analysed);
            }
        }
    }

    // it is, maybe (?) possible for partials to be out of order
    analysedPartials.sort((a, b) => a.frequency - b.frequency);

    // and possible no partials survived 😔
    if (analysedPartials.length === 0) {
        return generateEmptyCSV(options.profileName);
    }

    const referenceFreq = analysedPartials[0].frequency;
    const loudestAmp = Math.max(...analysedPartials.map(p => p.peakAmp));
    const maxDecayValue = Math.max(...analysedPartials.map(p => p.decayValue));

    const partials = analysedPartials.map(p => {
        return {
            ratio: p.frequency / referenceFreq,
            gainDB: amplitudeToDecibels(p.peakAmp, loudestAmp),
            decay: p.decayValue / maxDecayValue
        };
    });

    // filtering out subharmonics, but maybe add an option to keep them later?
    let filteredPartials = partials.filter(p => p.ratio >= 1.0);

    if (options.quantise) {
        filteredPartials = quantisePartials(filteredPartials);
    }
    if (options.oddOnly) {
        filteredPartials = discardEvenHarmonics(filteredPartials);
    }

    if (filteredPartials.length === 0) {
        return generateEmptyCSV(options.profileName);
    }

    return generateZebraCSV(filteredPartials, options.profileName);
}

function analysePartial(partial, globalMaxAmp, totalDuration) {
    // filter out short partials
    const partialDuration = partial.time[partial.time.length - 1];
    if (partialDuration < totalDuration * MIN_DURATION_RATIO) {
        return null;
    }

    // filter out wonky partials
    const freqCV = coefficientOfVariation(partial.freq);
    if (freqCV > MAX_FREQUENCY_CV) {
        return null;
    }

    // filter out low amplitude partials
    const maxAmpIndex = indexOfMax(partial.amp);
    const peakAmp = partial.amp[maxAmpIndex];
    if (peakAmp < globalMaxAmp * MIN_AMPLITUDE_RATIO) {
        return null;
    }

    // make sure this partial is decaying
    // this might not be good, maybe change the way we calculate decay later?
    // actually I think this is fine since every partial needs at least 2 points
    const timeAtPeak = partial.time[maxAmpIndex];
    const timeAtEnd = partial.time[partial.time.length - 1];
    if (timeAtEnd <= timeAtPeak) {
        return null;
    }

    const frequency = partial.freq[maxAmpIndex];
    const finalAmp = partial.amp[partial.amp.length - 1];
    const decayValue = calculateDecayValue(peakAmp, finalAmp, timeAtPeak, timeAtEnd);

    return {
        frequency,
        peakAmp,
        decayValue,
        timeAtPeak,
        timeAtEnd,
        finalAmp
    };
}

// misc helpers

function parseVutuFile(fileText) {
    try {
        const vutuData = JSON.parse(fileText);
        return vutuData;
    } catch (error) {
        throw new Error(`Failed to parse Vutu file: ${error.message}`);
    }
}

// maths helper functions
// not sure if anything else needs to be added here

function standardDeviation(values) {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
}

function indexOfMax(array) {
    let maxIndex = 0;
    let maxValue = array[0];
    for (let i = 1; i < array.length; i++) {
        if (array[i] > maxValue) {
            maxValue = array[i];
            maxIndex = i;
        }
    }
    return maxIndex;
}

function average(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function coefficientOfVariation(values) {
    const avg = average(values);
    const stdDev = standardDeviation(values);
    return stdDev / avg;
}

function amplitudeToDecibels(amp, referenceAmp) {
    return 20 * Math.log10(amp / referenceAmp);
}

function calculateDecayValue(peakAmp, finalAmp, timeAtPeak, timeAtEnd) {
    const duration = timeAtEnd - timeAtPeak;
    const amplitudeDrop = peakAmp - finalAmp;
    return duration / amplitudeDrop;
}

function roundToNearest(value, nearest) {
    return Math.round(value / nearest) * nearest;
}

function isEvenHarmonic(ratio) {
    const rounded = Math.round(ratio);
    if (rounded % 2 === 0 && rounded > 0) {
        return Math.abs(ratio - rounded) < 0.5;
    }
    return false;
}