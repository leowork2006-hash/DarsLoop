export const runtime="nodejs";
export function GET(){return Response.json({status:"ok",service:"darsloop"},{headers:{"Cache-Control":"no-store"}});}
