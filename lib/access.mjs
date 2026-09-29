export function isOperator(email,allowlist){return typeof email==='string'&&typeof allowlist==='string'&&allowlist.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase())}
export function checkOrigin(request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin}
export function ownsResource(owner,resource){return !!owner&&!!resource&&resource.owner===owner}
export function validLease(job,owner,lease,now=Date.now()){return ownsResource(owner,job)&&job.status==='analyzing'&&job.lease_id===lease&&typeof job.lease_until==='number'&&job.lease_until>now}
