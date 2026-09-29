export const STATES = [['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];
export function normalizePlate(value) {
 if(typeof value !== 'string') throw new Error('Enter a license plate.');
 const plate=value.trim().toUpperCase().replace(/[ -]/g,'');
 if(!/^[A-Z0-9]{1,10}$/.test(plate)) throw new Error('Use 1–10 letters or numbers for the plate.');
 return plate;
}
export function validateLookup(input) {
 const plate=normalizePlate(input?.plate);
 if(!STATES.some(([code])=>code===input?.state)) throw new Error('Choose the registration state.');
 return {plate,state:input.state};
}
export function validateDetection(input) {
 const plate=normalizePlate(input?.plate);
 const {confidence,votes}=input||{};
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1) throw new Error('Confidence must be between 0 and 1.');
 if(!Number.isInteger(votes)||votes<1||votes>1000000) throw new Error('Observation count is invalid.');
 return {plate,confidence,votes};
}
export const DEMO_RECORD={id:'sample-9wkr761',plate:'9WKR761',state:'CA',confidence:0.995618097899958,votes:86,detected_at:'2026-09-19T16:19:54',truck_id:'TRUCK-01',destination:'Demo Tow Yard',review_status:'demo',source_filename:'tow_test.mp4',snapshot_url:'/media/evidence.jpg',is_demo:true,analyzed_frames:null};
