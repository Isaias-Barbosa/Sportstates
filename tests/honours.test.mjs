import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHonours} from '../server/teams.mjs';
const carioca='Campeonato Carioca - 1914, 1915, 1920, 1921, 1925, 1927, 1939, 1942, 1943, 1944, 1953, 1954, 1955, 1963, 1965, 1972, 1974, 1978, 1979-I, 1979-II, 1981, 1986, 1991, 1996, 1999, 2000, 2001, 2004, 2007, 2008, 2009, 2011, 2014, 2017, 2019, 2020, 2021, 2024, 2025 e 2026.';
test('permite linha de títulos longa com anos e edições',()=>{assert.ok(carioca.length>160);assert.deepEqual(validateHonours([carioca,' Campeonato Brasileiro - 1980, 1982 e 2025. ']),[carioca,'Campeonato Brasileiro - 1980, 1982 e 2025.']);});
test('limita textos excessivos e inválidos',()=>{assert.throws(()=>validateHonours(['a'.repeat(3001)]),/títulos/);assert.throws(()=>validateHonours(['']),/títulos/);assert.throws(()=>validateHonours(Array(51).fill('um')),/títulos/);});
