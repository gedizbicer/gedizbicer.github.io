const cos = Math.cos;
const sin = Math.sin;
const sqrt = Math.sqrt;
const PI = Math.PI;

export const rad = (deg) => (deg * PI) / 180;

export function getBodyPos(keplerParams, tCent) {
    const KP = keplerParams;
    const a = KP.a + KP.aDot * tCent;
    const e = KP.e + KP.eDot * tCent;
    const I = rad(KP.I + KP.IDot * tCent);
    const L = rad(KP.L + KP.LDot * tCent);
    const B = rad(KP.B + KP.BDot * tCent);
    const O = rad(KP.O + KP.ODot * tCent);

    const w = B - O;
    let M = L - B + ((KP.b || 1) * tCent * tCent) + (KP.c || 1) * cos((KP.f || 1) * tCent) + (KP.s || 1) * sin((KP.f || 1) * tCent);

    M = (M + PI) % (2 * PI) - PI;

    const E = solveKepler(M, e);

    const xP = a * (cos(E) - e);
    const yP = a * sqrt(1 - e * e) * sin(E);

    const xEcl = (cos(w) * cos(O) - sin(w) * sin(O) * cos(I)) * xP + (-sin(w) * cos(O) - cos(w) * sin(O) * cos(I)) * yP;
    const yEcl = (cos(w) * sin(O) + sin(w) * cos(O) * cos(I)) * xP + (-sin(w) * sin(O) + cos(w) * cos(O) * cos(I)) * yP;
    const zEcl = (sin(w) * sin(I)) * xP + (cos(w) * sin(I)) * yP;

    return [ xEcl, zEcl, yEcl ];
}

function solveKepler(M, e) {
    let E = M + e * sin(M);
    let dE = 1;

    let count = 0;

    while (Math.abs(dE) > 1e-6) {
        const dM = M - (E - e * sin(E));
        dE = dM / (1 - e * cos(E));
        E += dE;
        ++count;

        if (count > 1e5)
            throw new Error("you need to have 232323 cpu cores to run this smh");
    }

    return E;
}

export function getSemiMinor(keplerParams, tCent) {
    return (keplerParams.a + keplerParams.aDot * tCent) * sqrt(1 - (keplerParams.e + keplerParams.eDot * tCent) * (keplerParams.e + keplerParams.eDot * tCent));
}