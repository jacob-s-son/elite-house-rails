class AddDescriptionDescriptionRuToCategory < ActiveRecord::Migration
  def self.up
    add_column :categories, :description, :text
    add_column :categories, :description_ru, :text
  end

  def self.down
    remove_column :categories, :description_ru
    remove_column :categories, :description
  end
end
