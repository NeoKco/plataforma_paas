import { apiRequest } from "./api";
import type {
  HealthStatusResponse,
  InstallSetupRequest,
  InstallSetupResponse,
  InstallStatusResponse,
} from "../types";

export function getHealthStatus() {
  return apiRequest<HealthStatusResponse>("/health");
}

export function getInstallerStatus() {
  return apiRequest<InstallStatusResponse>("/install/");
}

export function runInstallerSetup(payload: InstallSetupRequest) {
  return apiRequest<InstallSetupResponse>("/install/setup", {
    method: "POST",
    body: payload,
  });
}
