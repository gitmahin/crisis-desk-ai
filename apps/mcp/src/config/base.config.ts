import "dotenv/config"

type BaseConfigType = {
    PORT: number
    HOST: string
}

export const baseConfig: BaseConfigType = {
    PORT: Number(process.env.PORT) || 5001,
    HOST: String(process.env.HOST) || '127.0.0.1',

}