export function parseHonour(value:string):{title:string;years:string[]} {
 const original=value.trim().replace(/^["'“”]+|["'“”]+$/g,'').trim();
 const match=original.match(/^(.+?)\s+(?:[-–—]|:|·)\s*(.+)$/);
 if(!match)return {title:original,years:[]};
 const years=match[2].replace(/\s+e\s+/gi,',').split(',').map(s=>s.trim().replace(/\.$/,''));
 if(!years.length||years.some(y=>!/^\d{4}(?:[-–][a-z0-9]+)?$/i.test(y)))return {title:original,years:[]};
 return {title:match[1].trim(),years};
}
