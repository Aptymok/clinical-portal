type SourceObservation = {
    enabled?: boolean;
    id: string;
    providerType: string;
    readAuthority: boolean;
    lastSyncAt: Date | null;
    webhookEnabled: boolean;
    config?: unknown;
};
// Ten-minute maintenance plus five minutes of delivery tolerance. A row arriving
// through intake is not a complete-source observation and must not refresh this.
export const MAX_OBSERVATION_AGE_MS = 15 * 60000;
export function calendarCoverage(sources: SourceObservation[], now = new Date()) {
    const external = sources.filter(source => source.providerType !== 'CLINICAL_PORTAL');
    const unverifiedSources = external.filter(source => {
        const age = source.lastSyncAt ? now.getTime() - source.lastSyncAt.getTime() : Infinity;
        const config = source.config as {
            watchExpiration?: string;
        } | null;
        return source.enabled === false || !source.readAuthority || age < -60000 || age > MAX_OBSERVATION_AGE_MS ||
            (source.providerType === 'GOOGLE_CALENDAR' && (!source.webhookEnabled || Number(config?.watchExpiration || 0) <= now.getTime()));
    }).map(source => source.id);
    return { verified: external.length > 0 && unverifiedSources.length === 0, unverifiedSources };
}
export function providerCalendarRef(providerId: string) {
    return process.env.CALENDAR_INTERNAL_PROVIDER_ID === providerId ? process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo' : providerId;
}
export function internalProviderId(providerRef: string) {
    return providerRef === (process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo') ? process.env.CALENDAR_INTERNAL_PROVIDER_ID || providerRef : providerRef;
}
