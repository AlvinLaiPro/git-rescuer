type Operation = 'compare' | 'merge';
type Repository<T extends Operation> = T extends 'compare'
  ? {
      name: string;
      local_branch: string;
      remote_branch?: string;
      repository_path?: string;
      new_branch_name?: never;
      message?: never;
    }
  : {
      name: string;
      local_branch: string;
      remote_branch: string;
      repository_path?: string;
      new_branch_name: string;
      prepare?: string;
      message: string;
    };
export type Config = {
  compare?: Repository<'compare'>[];
  merge?: Repository<'merge'>[];
  rootPath: string;
};
