class RemoveImageColumnsFromSubcategory < ActiveRecord::Migration
  def self.up
    def self.up
      remove_column :sub_categories, :image_file_name
      remove_column :sub_categories, :image_content_type
      remove_column :sub_categories, :image_file_size
      remove_column :sub_categories, :image_updated_at
    end

    def self.down
      add_column :sub_categories, :image_file_name, :string
      add_column :sub_categories, :image_content_type, :string
      add_column :sub_categories, :image_file_size, :integer
      add_column :sub_categories, :image_updated_at, :datetime
    end
  end

  def self.down
  end
end
