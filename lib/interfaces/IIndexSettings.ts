export interface IIndexSettings {
  settings?: {
    number_of_shards?: number;
    number_of_replicas?: number;
    refresh_interval?: string;
    max_result_window?: number;
  };
  aliases?: any;
}
