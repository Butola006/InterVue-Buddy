import mongoose from "mongoose"

const connectToDB = async () => {
    const uri = process.env.MONGO_URI

    if (!uri) {
        throw new Error("MONGO_URI is not defined in environment variables")
    }

    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })

    console.log("Connected to MongoDB")
}

export default connectToDB
