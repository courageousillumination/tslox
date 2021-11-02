import { RuntimeException } from ".";

export class Environment {
  private readonly data = new Map<string, any>();

  constructor(private readonly enclosing?: Environment) {}

  public define(name: string, value: any) {
    this.data.set(name, value);
  }

  public assign(name: string, value: any) {
    if (this.data.has(name)) {
      this.data.set(name, value);
      return;
    }

    if (this.enclosing) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeException("Variable missing decleration '" + name + "'.");
  }

  public get(name: string): any {
    if (this.data.has(name)) {
      return this.data.get(name);
    }

    if (this.enclosing) {
      return this.enclosing.get(name);
    }

    throw new RuntimeException("Undefined variable '" + name + "'.");
  }

  public getAt(distance: number, name: string): any {
    return this.ancestor(distance).get(name);
  }

  public assignAt(distance: number, name: string, value: any) {
    this.ancestor(distance).assign(name, value);
  }

  private ancestor(distance: number) {
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing as Environment;
    }

    return environment;
  }
}
