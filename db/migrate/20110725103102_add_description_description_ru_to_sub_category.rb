class AddDescriptionDescriptionRuToSubCategory < ActiveRecord::Migration
  def self.up
    add_column :sub_categories, :description, :text
    add_column :sub_categories, :description_ru, :text
  end

  def self.down
    remove_column :sub_categories, :description_ru
    remove_column :sub_categories, :description
  end
end
