import {SCIENCE_CLAIMS,FRAMEWORK_SOURCES,FRAMEWORK_VERSION,BODY_SYSTEMS,FRAMEWORK_REVISIONS} from '@/lib/science-registry';
import {TEST_IDS} from '@/lib/framework-tests';
export function GET(){return Response.json({version:FRAMEWORK_VERSION,claims:SCIENCE_CLAIMS,sources:FRAMEWORK_SOURCES,bodySystems:BODY_SYSTEMS,revisions:FRAMEWORK_REVISIONS,executableTests:TEST_IDS,policy:'AI proposals and model checks cannot automatically admit established physical laws.'},{headers:{'Cache-Control':'no-cache'}});}
