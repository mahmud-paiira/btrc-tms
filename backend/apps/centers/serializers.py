from rest_framework import serializers
from .models import Center, Infrastructure, Employee


class InfrastructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Infrastructure
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class EmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name_bn = serializers.CharField(source='user.full_name_bn', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ('created_at',)


class CenterListSerializer(serializers.ModelSerializer):
    infrastructure_count = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()
    trainer_based_capacity = serializers.SerializerMethodField()
    effective_max_seats = serializers.SerializerMethodField()

    class Meta:
        model = Center
        fields = (
            'id', 'code', 'name_bn', 'name_en', 'short_name_bn',
            'phone', 'email', 'status',
            'center_type', 'overflow_percentage', 'quality_score',
            'seats_per_trainer', 'trainer_based_capacity', 'effective_max_seats',
            'latitude', 'longitude',
            'infrastructure_count', 'employee_count', 'created_at',
        )

    def get_infrastructure_count(self, obj):
        return obj.infrastructures.count()

    def get_employee_count(self, obj):
        return obj.employees.count()

    def get_trainer_based_capacity(self, obj):
        return obj.get_trainer_based_capacity()

    def get_effective_max_seats(self, obj):
        return obj.get_effective_max_seats()


class CenterDetailSerializer(serializers.ModelSerializer):
    infrastructures = InfrastructureSerializer(many=True, required=False)
    employees = EmployeeSerializer(many=True, required=False)
    trainer_based_capacity = serializers.SerializerMethodField()
    effective_max_seats = serializers.SerializerMethodField()

    class Meta:
        model = Center
        fields = '__all__'
        read_only_fields = ('code', 'created_at')

    def get_trainer_based_capacity(self, obj):
        return obj.get_trainer_based_capacity()

    def get_effective_max_seats(self, obj):
        return obj.get_effective_max_seats()

    def create(self, validated_data):
        infra_data = validated_data.pop('infrastructures', [])
        emp_data = validated_data.pop('employees', [])
        center = super().create(validated_data)
        for item in infra_data:
            item.pop('center', None)
            Infrastructure.objects.create(center=center, **item)
        for item in emp_data:
            item.pop('center', None)
            Employee.objects.create(center=center, **item)
        return center

    def update(self, instance, validated_data):
        infra_data = validated_data.pop('infrastructures', None)
        emp_data = validated_data.pop('employees', None)
        center = super().update(instance, validated_data)
        if infra_data is not None:
            center.infrastructures.all().delete()
            for item in infra_data:
                item.pop('center', None)
                Infrastructure.objects.create(center=center, **item)
        if emp_data is not None:
            center.employees.all().delete()
            for item in emp_data:
                item.pop('center', None)
                Employee.objects.create(center=center, **item)
        return center
