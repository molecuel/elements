export interface IDatabaseAdapter {
  name: string;
  type: string;
  idPattern: string;
  register(model: object);
  save(instance: object);
  update(instance: object);
  find(id?: string | number, query?: any);
  delete(id?: string | number);
}
