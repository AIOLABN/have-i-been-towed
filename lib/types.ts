export type TowRecord = { id:string;plate:string;state:string;confidence:number;votes:number;detected_at:string;truck_id:string;destination:string;review_status:string;source_filename:string;snapshot_url:string|null;is_demo?:boolean;analyzed_frames?:number|null };
export type Job = {id:string;source_filename:string;status:string;created_at:string;error:string|null;result_count:number|null};
export type Session = {signedIn:boolean;operator:boolean;displayName?:string};
