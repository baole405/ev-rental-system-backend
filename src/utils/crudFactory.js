export const applyPopulate = (query, populate) => {
  if (!populate) {
    return query;
  }

  if (Array.isArray(populate)) {
    return populate.reduce((currentQuery, population) => {
      if (!population) {
        return currentQuery;
      }
      return currentQuery.populate(population);
    }, query);
  }

  return query.populate(populate);
};

export const createCrudHandlers = (
  Model,
  { defaultSort = { createdAt: -1, _id: -1 }, populate } = {}
) => {
  const list = async (req, res, next) => {
    try {
      let query = Model.find();
      query = applyPopulate(query, populate);
      const items = await query.sort(defaultSort);
      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  };

  const get = async (req, res, next) => {
    try {
      let query = Model.findById(req.params.id);
      query = applyPopulate(query, populate);
      const item = await query;
      if (!item) {
        return res.status(404).json({ message: `${Model.modelName} not found` });
      }
      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  };

  const create = async (req, res, next) => {
    try {
      const payload = req.body;
      let item = await Model.create(payload);
      if (populate) {
        item = await item.populate(populate);
      }
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  };

  const update = async (req, res, next) => {
    try {
      let item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!item) {
        return res.status(404).json({ message: `${Model.modelName} not found` });
      }

      if (populate) {
        item = await item.populate(populate);
      }

      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  };

  const remove = async (req, res, next) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) {
        return res.status(404).json({ message: `${Model.modelName} not found` });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return { list, get, create, update, remove };
};

export default createCrudHandlers;
