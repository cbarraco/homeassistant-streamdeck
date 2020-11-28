interface BaseAction {
  onWillAppear(context: string | number, settings: any, coordinates: any): void;
  onUpdateSettings(context: any, settings: any): void;
  onRequestSettings(action: any, context: string | number): void;
  onKeyUp(
    context: any,
    settings: { [x: string]: any },
    coordinates: any,
    userDesiredState: any
  ): void;
}
