export interface IDatabaseAdapter {
  name: string;
  type: string;
  idPattern: string;
  register(model: Object);
  save(instance: Object);
  update(instance: Object);
  find(id?: string | number, query?: any);
  delete(id?: string | number);
}
