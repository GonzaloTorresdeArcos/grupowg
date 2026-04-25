import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Captura errores de render y los vuelca a console.error con stack completo
 * y contexto de componente, para depuración del TypeError "r is not a function".
 */
export class ErrorLogger extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorLogger]", {
      context: this.props.context ?? "unknown",
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Se ha producido un error en este bloque.</p>
          <p className="text-xs mt-1 opacity-80">
            Revisa la consola del navegador para ver el stack completo (contexto: {this.props.context ?? "unknown"}).
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
