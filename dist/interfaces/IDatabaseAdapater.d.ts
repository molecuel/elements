import { Elements } from '../index';
export interface IDatabaseAdapter {
    elements: Elements;
    register(): any;
    save(): any;
    find(): any;
    delete(): any;
}
