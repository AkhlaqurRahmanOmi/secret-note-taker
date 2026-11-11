import { Model, PipelineStage, ProjectionType, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { Paginated } from '../pagination/paginated';

/** A plain (lean) document. */
export type Stored<T> = T & { _id: Types.ObjectId };

export interface PageQuery {
  page: number;
  limit: number;
}

/**
 * Shared operations, all protected: subclasses expose one named method per query, so
 * services can't run ad-hoc filters. Reads are lean.
 */
export abstract class BaseRepository<T> {
  protected constructor(protected readonly model: Model<T>) {}

  /** `toObject()` runs the schema transform, which strips the password hash. */
  protected async create(data: Partial<T>): Promise<Stored<T>> {
    const doc = await this.model.create(data);
    return doc.toObject() as Stored<T>;
  }

  protected findOne(filter: QueryFilter<T>, projection?: ProjectionType<T>): Promise<Stored<T> | null> {
    return this.model.findOne(filter, projection).lean<Stored<T>>().exec();
  }

  /**
   * One page, newest first (`_id` order is creation order). An unfiltered count reads
   * collection metadata instead of scanning.
   */
  protected async paginate(
    filter: QueryFilter<T>,
    { page, limit }: PageQuery,
    projection?: ProjectionType<T>,
  ): Promise<Paginated<Stored<T>>> {
    const unfiltered = Object.keys(filter).length === 0;
    const [data, total] = await Promise.all([
      this.model
        .find(filter, projection)
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Stored<T>[]>()
        .exec(),
      unfiltered ? this.model.estimatedDocumentCount().exec() : this.model.countDocuments(filter).exec(),
    ]);
    return new Paginated(data, { page, limit, total });
  }

  /** The updated document, or null if nothing matched. */
  protected updateOne(filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<Stored<T> | null> {
    return this.model
      .findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true })
      .lean<Stored<T>>()
      .exec();
  }

  protected async deleteOne(filter: QueryFilter<T>): Promise<boolean> {
    const { deletedCount } = await this.model.deleteOne(filter).exec();
    return deletedCount === 1;
  }

  protected async deleteMany(filter: QueryFilter<T>): Promise<number> {
    const { deletedCount } = await this.model.deleteMany(filter).exec();
    return deletedCount;
  }

  /** Pipelines aren't cast or sanitized: pass ObjectIds and validated values only. */
  protected aggregate<R>(pipeline: PipelineStage[]): Promise<R[]> {
    return this.model.aggregate<R>(pipeline).exec();
  }
}
