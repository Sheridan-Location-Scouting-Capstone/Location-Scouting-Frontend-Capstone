export type PhotoUploadInput = {
    locationId?: string
    buffer: Buffer
    filename: string
    mimeType: string
    displayOrder?: number
}