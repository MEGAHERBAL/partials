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

// helper functions - what other common functions need to be made?

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